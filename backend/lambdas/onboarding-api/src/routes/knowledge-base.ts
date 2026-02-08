import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  query,
  createSuccessResponse,
  createErrorResponse,
  parseBody,
  getCustomerIdFromPath,
  KnowledgeBaseUploadResponse,
  KnowledgeBaseTextRequest,
} from 'consultia-shared-nodejs';
import Joi from 'joi';
import { S3, SQS } from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

const s3 = new S3();
const sqs = new SQS();

// Validation schemas
const uploadSchema = Joi.object({
  file_name: Joi.string().required(),
  file_size: Joi.number().max(10 * 1024 * 1024).required(), // Max 10MB
  content_type: Joi.string()
    .valid(
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain'
    )
    .required(),
});

const textSchema = Joi.object({
  manual_text: Joi.string().min(10).max(50000).required(),
  category: Joi.string().optional(),
});

/**
 * POST /onboarding/:customerId/knowledge-base/upload
 *
 * Step 4a: Generate presigned URL for file upload to S3
 */
export async function handleKnowledgeBaseUpload(
  event: APIGatewayProxyEvent,
  requestId: string
): Promise<APIGatewayProxyResult> {
  try {
    const customerId = getCustomerIdFromPath(event);

    // Check if this is file upload or text submission
    const path = event.path;
    if (path.endsWith('/text')) {
      return await handleKnowledgeBaseText(event, requestId);
    }

    // File upload path
    const body = parseBody<{
      file_name: string;
      file_size: number;
      content_type: string;
    }>(event.body, event.isBase64Encoded);

    // Validate request
    const { error, value } = uploadSchema.validate(body);
    if (error) {
      return createErrorResponse(
        'VALIDATION_ERROR',
        error.details[0].message,
        400,
        { field: error.details[0].path[0] },
        requestId
      );
    }

    const { file_name, file_size, content_type } = value;

    console.log('[KB Upload]', {
      customerId,
      file_name,
      file_size,
      content_type,
    });

    // Determine file extension
    // Note: application/msword (.doc) is mapped to 'docx' — python-docx handles
    // modern .doc files that are actually .docx with wrong extension. True legacy
    // .doc files will fail at the processor with a clear error.
    const ext = content_type === 'application/pdf'
      ? 'pdf'
      : content_type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        || content_type === 'application/msword'
      ? 'docx'
      : 'txt';

    // Generate S3 key
    const source_id = uuidv4();
    const timestamp = Date.now();
    const s3_key = `${customerId}/${timestamp}/${source_id}.${ext}`;
    const bucket = process.env.KNOWLEDGE_BASE_BUCKET!;

    // Get or create knowledge base record
    let kbResult = await query(
      'SELECT kb_id FROM knowledge_bases WHERE customer_id = $1',
      [customerId]
    );

    let kb_id: string;
    if (kbResult.rows.length === 0) {
      // Create knowledge base
      const createResult = await query(
        `INSERT INTO knowledge_bases (customer_id, processing_status)
         VALUES ($1, 'pending')
         RETURNING kb_id`,
        [customerId]
      );
      kb_id = createResult.rows[0].kb_id;
    } else {
      kb_id = kbResult.rows[0].kb_id;
    }

    // Create kb_source record
    await query(
      `INSERT INTO kb_sources (
        source_id,
        kb_id,
        source_type,
        file_name,
        s3_key,
        file_size_bytes,
        processing_status
      ) VALUES ($1, $2, $3, $4, $5, $6, 'pending')`,
      [source_id, kb_id, ext, file_name, s3_key, file_size]
    );

    // Generate presigned URL for upload (valid for 15 minutes)
    const upload_url = s3.getSignedUrl('putObject', {
      Bucket: bucket,
      Key: s3_key,
      ContentType: content_type,
      Expires: 900, // 15 minutes
    });

    console.log('[KB Upload] Presigned URL generated', { source_id, s3_key });

    const response: KnowledgeBaseUploadResponse = {
      source_id,
      s3_key,
      upload_url,
    };

    return createSuccessResponse(response, 200, requestId);
  } catch (error: any) {
    if (error.name === 'ValidationError') throw error;
    console.error('[KB Upload Error]', error);

    return createErrorResponse(
      'KB_UPLOAD_ERROR',
      'Failed to process knowledge base upload',
      500,
      null,
      requestId
    );
  }
}

/**
 * POST /onboarding/:customerId/knowledge-base/text
 *
 * Step 4b: Submit manual text entry
 */
async function handleKnowledgeBaseText(
  event: APIGatewayProxyEvent,
  requestId: string
): Promise<APIGatewayProxyResult> {
  try {
    const customerId = getCustomerIdFromPath(event);
    const body = parseBody<KnowledgeBaseTextRequest>(event.body, event.isBase64Encoded);

    // Validate request
    const { error, value } = textSchema.validate(body);
    if (error) {
      return createErrorResponse(
        'VALIDATION_ERROR',
        error.details[0].message,
        400,
        { field: error.details[0].path[0] },
        requestId
      );
    }

    const { manual_text, category } = value;

    console.log('[KB Text]', {
      customerId,
      text_length: manual_text.length,
      category,
    });

    // Get or create knowledge base
    let kbResult = await query(
      'SELECT kb_id FROM knowledge_bases WHERE customer_id = $1',
      [customerId]
    );

    let kb_id: string;
    if (kbResult.rows.length === 0) {
      const createResult = await query(
        `INSERT INTO knowledge_bases (customer_id, processing_status)
         VALUES ($1, 'pending')
         RETURNING kb_id`,
        [customerId]
      );
      kb_id = createResult.rows[0].kb_id;
    } else {
      kb_id = kbResult.rows[0].kb_id;
    }

    // Create kb_source with manual text
    const source_id = uuidv4();
    await query(
      `INSERT INTO kb_sources (
        source_id,
        kb_id,
        source_type,
        file_name,
        raw_text,
        processing_status
      ) VALUES ($1, $2, 'manual_text', $3, $4, 'pending')`,
      [source_id, kb_id, category || 'manual-entry', manual_text]
    );

    // Trigger processing (SQS message to knowledge-base-processor Lambda)
    if (!process.env.KB_PROCESSING_QUEUE_URL) {
      console.error('[KB Text] KB_PROCESSING_QUEUE_URL not configured');
      return createErrorResponse(
        'CONFIG_ERROR',
        'Knowledge base processing is not configured',
        500,
        null,
        requestId
      );
    }

    try {
      await sqs
        .sendMessage({
          QueueUrl: process.env.KB_PROCESSING_QUEUE_URL,
          MessageBody: JSON.stringify({
            source_id,
            kb_id,
            customer_id: customerId,
            source_type: 'manual_text',
          }),
        })
        .promise();

      console.log('[KB Text] Processing job queued', { source_id });
    } catch (sqsError: any) {
      console.error('[KB Text] Failed to queue processing job', sqsError);
      // Update source status to error so polling doesn't hang
      await query(
        `UPDATE kb_sources SET processing_status = 'error', error_message = $1 WHERE source_id = $2`,
        [`Failed to queue processing: ${sqsError.message}`, source_id]
      );
      return createErrorResponse(
        'QUEUE_ERROR',
        'Failed to start knowledge base processing',
        500,
        null,
        requestId
      );
    }

    return createSuccessResponse(
      {
        source_id,
        kb_id,
        message: 'Manual text submitted successfully',
      },
      201,
      requestId
    );
  } catch (error: any) {
    console.error('[KB Text Error]', error);

    return createErrorResponse(
      'KB_TEXT_ERROR',
      'Failed to process knowledge base text',
      500,
      null,
      requestId
    );
  }
}

/**
 * POST /onboarding/:customerId/knowledge-base/confirm-upload
 *
 * Step 4b: Confirm file was uploaded to S3 and trigger processing
 */
export async function handleConfirmUpload(
  event: APIGatewayProxyEvent,
  requestId: string
): Promise<APIGatewayProxyResult> {
  try {
    const customerId = getCustomerIdFromPath(event);
    const body = parseBody<{ source_id: string }>(event.body, event.isBase64Encoded);

    if (!body.source_id) {
      return createErrorResponse('VALIDATION_ERROR', 'source_id is required', 400, null, requestId);
    }

    const { source_id } = body;

    // Verify the kb_source record exists and belongs to this customer
    const sourceResult = await query(
      `SELECT ks.source_id, ks.kb_id, ks.s3_key, ks.processing_status, kb.customer_id
       FROM kb_sources ks
       JOIN knowledge_bases kb ON kb.kb_id = ks.kb_id
       WHERE ks.source_id = $1 AND kb.customer_id = $2`,
      [source_id, customerId]
    );

    if (sourceResult.rows.length === 0) {
      return createErrorResponse('NOT_FOUND', 'Source not found for this customer', 404, null, requestId);
    }

    const source = sourceResult.rows[0];

    if (source.processing_status !== 'pending') {
      return createErrorResponse('INVALID_STATE', `Source already in state: ${source.processing_status}`, 409, null, requestId);
    }

    // Verify file exists in S3
    const bucket = process.env.KNOWLEDGE_BASE_BUCKET!;
    try {
      await s3.headObject({ Bucket: bucket, Key: source.s3_key }).promise();
    } catch (s3Error: any) {
      console.error('[KB ConfirmUpload] File not found in S3', { source_id, s3_key: source.s3_key, error: s3Error.code });
      return createErrorResponse('FILE_NOT_FOUND', 'File has not been uploaded to S3 yet', 400, null, requestId);
    }

    // Send SQS message to trigger processing
    await sqs
      .sendMessage({
        QueueUrl: process.env.KB_PROCESSING_QUEUE_URL!,
        MessageBody: JSON.stringify({
          source_id,
          kb_id: source.kb_id,
          customer_id: customerId,
          source_type: 'file',
        }),
      })
      .promise();

    console.log('[KB ConfirmUpload] Processing job queued', { source_id });

    return createSuccessResponse({ source_id, message: 'Processing triggered' }, 200, requestId);
  } catch (error: any) {
    console.error('[KB ConfirmUpload Error]', error);
    return createErrorResponse('KB_CONFIRM_ERROR', 'Failed to confirm upload', 500, null, requestId);
  }
}

/**
 * GET /onboarding/:customerId/knowledge-base/status
 *
 * Step 4c: Get knowledge base processing status
 */
export async function getKnowledgeBaseStatus(
  customerId: string,
  requestId: string
): Promise<APIGatewayProxyResult> {
  try {
    // Get knowledge base and all sources
    const kbResult = await query(
      `SELECT kb_id, processing_status, total_sources, structured_data
       FROM knowledge_bases
       WHERE customer_id = $1`,
      [customerId]
    );

    if (kbResult.rows.length === 0) {
      return createSuccessResponse(
        {
          status: 'pending',
          progress: 0,
          total_sources: 0,
          processed_sources: 0,
          sources: [],
          has_structured_data: false,
        },
        200,
        requestId
      );
    }

    const kb = kbResult.rows[0];

    // Get all sources
    const sourcesResult = await query(
      `SELECT source_id, source_type, file_name, processing_status, uploaded_at, processed_at
       FROM kb_sources
       WHERE kb_id = $1
       ORDER BY uploaded_at DESC`,
      [kb.kb_id]
    );

    const sources = sourcesResult.rows;
    const total = sources.length;
    const completed = sources.filter((s) => s.processing_status === 'complete').length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    return createSuccessResponse(
      {
        kb_id: kb.kb_id,
        status: kb.processing_status,
        progress,
        total_sources: total,
        processed_sources: completed,
        sources,
        has_structured_data: !!kb.structured_data,
      },
      200,
      requestId
    );
  } catch (error: any) {
    console.error('[KB Status Error]', error);

    return createErrorResponse(
      'KB_STATUS_ERROR',
      'Failed to retrieve knowledge base status',
      500,
      null,
      requestId
    );
  }
}

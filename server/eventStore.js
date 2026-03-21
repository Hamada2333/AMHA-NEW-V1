// ─── EVENT STORE (append-only, immutable) ───
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, execute } from './db.js';
import eventBus from './eventBus.js';
import cache from './redis.js';

class EventStore {
  async append({
    eventType,
    userId = 'system',
    companyId = 'amha-default',
    entityType,
    entityId,
    payload,
    idempotencyKey = null,
  }) {
    const eventId = uuidv4();
    const timestamp = new Date().toISOString();
    const idemKey = idempotencyKey || `${eventType}:${entityId}:${timestamp}`;

    const lastEvent = await queryOne(
      'SELECT version FROM events WHERE entity_type = $1 AND entity_id = $2 ORDER BY version DESC LIMIT 1',
      [entityType, entityId]
    );
    const version = lastEvent ? lastEvent.version + 1 : 1;

    try {
      await execute(
        `INSERT INTO events (event_id, event_type, timestamp, user_id, company_id, entity_type, entity_id, payload, idempotency_key, version)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [eventId, eventType, timestamp, userId, companyId, entityType, entityId, JSON.stringify(payload), idemKey, version]
      );
    } catch (err) {
      if (err.message.includes('duplicate key value violates unique constraint')) {
        const existing = await queryOne('SELECT * FROM events WHERE idempotency_key = $1', [idemKey]);
        if (existing) {
          existing.payload = JSON.parse(existing.payload);
          return existing;
        }
      }
      throw err;
    }

    const event = {
      event_id: eventId,
      event_type: eventType,
      timestamp,
      user_id: userId,
      company_id: companyId,
      entity_type: entityType,
      entity_id: entityId,
      payload,
      version,
    };

    eventBus.emit(eventType, event);

    cache.recordSystemActivity({
      event_id: eventId,
      event_type: eventType,
      entity_type: entityType,
      entity_id: entityId,
      summary: this._summarize(eventType, payload),
      user_id: userId,
    });

    if (userId !== 'system') {
      cache.recordUserAction(userId, {
        event_id: eventId,
        event_type: eventType,
        entity_type: entityType,
        entity_id: entityId,
        summary: this._summarize(eventType, payload),
      });
    }

    return event;
  }

  async getByEntity(entityType, entityId) {
    const rows = await query(
      'SELECT * FROM events WHERE entity_type = $1 AND entity_id = $2 ORDER BY version ASC',
      [entityType, entityId]
    );
    return rows.map(r => ({ ...r, payload: JSON.parse(r.payload) }));
  }

  async getByType(eventType, limit = 50, offset = 0) {
    const rows = await query(
      'SELECT * FROM events WHERE event_type = $1 ORDER BY timestamp DESC LIMIT $2 OFFSET $3',
      [eventType, limit, offset]
    );
    return rows.map(r => ({ ...r, payload: JSON.parse(r.payload) }));
  }

  async getRecent(limit = 50) {
    const rows = await query(
      'SELECT * FROM events ORDER BY timestamp DESC LIMIT $1',
      [limit]
    );
    return rows.map(r => ({ ...r, payload: JSON.parse(r.payload) }));
  }

  async getCount() {
    const row = await queryOne('SELECT COUNT(*) as count FROM events');
    return parseInt(row.count);
  }

  async getCountByType() {
    const rows = await query(
      'SELECT event_type, COUNT(*) as count FROM events GROUP BY event_type ORDER BY count DESC'
    );
    return rows.map(r => ({ ...r, count: parseInt(r.count) }));
  }

  async replayAll(handler) {
    const rows = await query('SELECT * FROM events ORDER BY timestamp ASC');
    for (const row of rows) {
      handler({ ...row, payload: JSON.parse(row.payload) });
    }
  }

  _summarize(eventType, payload) {
    const summaries = {
      INVOICE_CREATED: `Invoice ${payload.number || ''} created for ${payload.customer || payload.customer_name || ''}`,
      INVOICE_SEND_REQUESTED: `Invoice ${payload.number || ''} send requested`,
      INVOICE_SENT: `Invoice ${payload.number || ''} sent successfully`,
      INVOICE_STATUS_UPDATED: `Invoice ${payload.number || ''} status changed to ${payload.after?.status || payload.status || ''}`,
      PAYMENT_RECEIVED: `Payment received for ${payload.number || ''} — ${payload.amount || ''}`,
      PAYMENT_REMINDER_REQUESTED: `Reminder requested for ${payload.number || ''}`,
      REMINDER_SENT: `Reminder sent for ${payload.number || ''}`,
      CUSTOMER_CREATED: `Customer "${payload.name || ''}" added`,
      SUPPLIER_CREATED: `Supplier "${payload.name || ''}" added`,
      PRODUCT_CREATED: `Product "${payload.name || ''}" added`,
      STOCK_UPDATED: `Stock updated for ${payload.name || payload.sku || ''}`,
      ORDER_CREATED: `Order ${payload.number || ''} created`,
      ORDER_CONVERTED: `Order ${payload.number || ''} converted to invoice`,
      RECEIPT_UPLOADED: `Receipt from ${payload.vendor || ''} uploaded`,
      RECEIPT_PROCESSED: `Receipt from ${payload.vendor || ''} processed`,
      LEAD_CREATED: `Lead "${payload.name || ''}" added`,
      LEAD_STATUS_UPDATED: `Lead "${payload.name || ''}" moved to ${payload.status || ''}`,
      REPORT_REQUESTED: `Report generation requested`,
      REPORT_GENERATED: `Report generated successfully`,
      SETTINGS_UPDATED: `Settings updated`,
    };
    return summaries[eventType] || `${eventType} occurred`;
  }
}

const eventStore = new EventStore();
export default eventStore;

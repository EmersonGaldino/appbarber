import { v4 as uuidv4 } from 'uuid';
import type { FastifyInstance } from 'fastify';
import { clearAppData, getAppData, getCollection } from './db.js';
import { emptyAppData } from './seed.js';
import { RESOURCE_NAMES, type Appointment, type ResourceName, type Transaction } from './types.js';

type Entity = { id: string; createdAt: string; [key: string]: unknown };

function isResourceName(value: string): value is ResourceName {
  return RESOURCE_NAMES.includes(value as ResourceName);
}

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async () => ({ ok: true }));

  app.get('/app-data', async () => {
    return getAppData();
  });

  app.delete('/app-data', async () => {
    await clearAppData();
    return emptyAppData;
  });

  app.get('/:resource', async (req, reply) => {
    const { resource } = req.params as { resource: string };
    if (!isResourceName(resource)) return reply.code(404).send({ error: 'Resource not found' });

    const records = await getCollection<Entity>(resource).find({}, { projection: { _id: 0 } }).toArray();
    return records;
  });

  app.post('/:resource', async (req, reply) => {
    const { resource } = req.params as { resource: string };
    if (!isResourceName(resource)) return reply.code(404).send({ error: 'Resource not found' });

    const body = (req.body ?? {}) as Partial<Entity>;
    const now = new Date().toISOString();
    const created: Entity = {
      ...body,
      id: body.id ?? uuidv4(),
      createdAt: body.createdAt ?? now,
    } as Entity;

    await getCollection<Entity>(resource).insertOne(created);
    return reply.code(201).send(created);
  });

  app.patch('/:resource/:id', async (req, reply) => {
    const { resource, id } = req.params as { resource: string; id: string };
    if (!isResourceName(resource)) return reply.code(404).send({ error: 'Resource not found' });

    const collection = getCollection<Entity>(resource);
    const existing = await collection.findOne({ id }, { projection: { _id: 0 } });
    if (!existing) return reply.code(404).send({ error: 'Record not found' });

    const patch = (req.body ?? {}) as Partial<Entity>;
    const updated: Entity = { ...existing, ...patch };

    await collection.updateOne({ id }, { $set: updated });

    // Mantém regra de negócio do app: ao completar atendimento, gera receita.
    if (resource === 'appointments') {
      const previousStatus = (existing as unknown as Appointment).status;
      const newStatus = (updated as unknown as Appointment).status;
      if (previousStatus !== 'completed' && newStatus === 'completed') {
        const appointment = updated as unknown as Appointment;
        const txCol = getCollection<Transaction & { id: string; createdAt: string }>('transactions');
        const txAlreadyExists = await txCol.findOne({ appointmentId: appointment.id });
        if (!txAlreadyExists) {
          const tx: Transaction & { id: string; createdAt: string } = {
            id: uuidv4(),
            type: 'income',
            category: 'service',
            description: `Atendimento - ${appointment.clientName}`,
            amount: appointment.totalValue,
            date: appointment.date,
            paymentMethod: appointment.paymentMethod,
            appointmentId: appointment.id,
            createdAt: new Date().toISOString(),
          };
          await txCol.insertOne(tx);
        }
      }
    }

    return updated;
  });

  app.delete('/:resource/:id', async (req, reply) => {
    const { resource, id } = req.params as { resource: string; id: string };
    if (!isResourceName(resource)) return reply.code(404).send({ error: 'Resource not found' });

    const collection = getCollection<Entity>(resource);
    const result = await collection.deleteOne({ id });
    if (!result.deletedCount) return reply.code(404).send({ error: 'Record not found' });

    // Mantém integridade local já existente no app.
    if (resource === 'professionals') {
      await getCollection<Entity>('users').deleteMany({ professionalId: id });
    }

    return { ok: true };
  });
}

import { OpportunityScrapedEvent } from '../events/schemas';
import { enqueuePushNotification } from '../queues/pushQueue';

export async function notificationConsumerHandler(event: OpportunityScrapedEvent) {
  const payload = event.payload;

  // In a real application, you might query the DB for users interested in this category
  // For demonstration, we mock sending a notification for the scraped opportunity
  const message = `New opportunity posted: ${payload.title} at ${payload.company}`;
  
  try {
    await enqueuePushNotification({
      userId: 'global-subscribers', // Example
      message: message
    });
    console.log(`[Notification Consumer] Enqueued notification: ${message}`);
  } catch (error) {
    console.error(`[Notification Consumer] Failed to enqueue notification:`, error);
    throw error; // Let RabbitMQ retry or move to dead letter queue
  }
}

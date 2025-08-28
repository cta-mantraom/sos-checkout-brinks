import { Subscription } from '../../domain/entities/Subscription.js';
import { ISubscriptionRepository } from './ISubscriptionRepository.js';
import { FirestoreClient } from '../firebase/FirestoreClient.js';

export class FirebaseSubscriptionRepository implements ISubscriptionRepository {
  private readonly collection = 'subscriptions';

  constructor(private readonly firestoreClient: FirestoreClient) {}

  async save(subscription: Subscription): Promise<void> {
    const subscriptionData = {
      id: subscription.getId(),
      profileId: subscription.getProfileId(),
      plan: subscription.getPlan(),
      status: subscription.getStatus(),
      startDate: subscription.getStartDate(),
      endDate: subscription.getEndDate(),
      amount: subscription.getAmount(),
      createdAt: subscription.getCreatedAt(),
      updatedAt: new Date()
    };

    await this.firestoreClient
      .collection(this.collection)
      .doc(subscription.getId())
      .set(subscriptionData);
  }

  async findById(id: string): Promise<Subscription | null> {
    const doc = await this.firestoreClient
      .collection(this.collection)
      .doc(id)
      .get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data();
    return new Subscription(
      data.id,
      data.profileId,
      data.plan,
      data.status,
      data.startDate,
      data.endDate,
      data.amount,
      data.createdAt
    );
  }

  async findByProfileId(profileId: string): Promise<Subscription[]> {
    const query = await this.firestoreClient
      .collection(this.collection)
      .where('profileId', '==', profileId)
      .orderBy('createdAt', 'desc')
      .get();

    return query.docs.map(doc => {
      const data = doc.data();
      return new Subscription(
        data.id,
        data.profileId,
        data.plan,
        data.status,
        data.startDate,
        data.endDate,
        data.amount,
        data.createdAt
      );
    });
  }

  async findActiveByProfileId(profileId: string): Promise<Subscription | null> {
    const now = new Date();
    const query = await this.firestoreClient
      .collection(this.collection)
      .where('profileId', '==', profileId)
      .where('status', '==', 'active')
      .where('endDate', '>', now)
      .orderBy('endDate', 'desc')
      .limit(1)
      .get();

    if (query.empty) {
      return null;
    }

    const doc = query.docs[0];
    const data = doc.data();
    return new Subscription(
      data.id,
      data.profileId,
      data.plan,
      data.status,
      data.startDate,
      data.endDate,
      data.amount,
      data.createdAt
    );
  }

  async update(subscription: Subscription): Promise<void> {
    const subscriptionData = {
      plan: subscription.getPlan(),
      status: subscription.getStatus(),
      endDate: subscription.getEndDate(),
      amount: subscription.getAmount(),
      updatedAt: new Date()
    };

    await this.firestoreClient
      .collection(this.collection)
      .doc(subscription.getId())
      .update(subscriptionData);
  }

  async findExpiring(days: number): Promise<Subscription[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    
    const query = await this.firestoreClient
      .collection(this.collection)
      .where('status', '==', 'active')
      .where('endDate', '<=', futureDate)
      .where('endDate', '>', new Date())
      .get();

    return query.docs.map(doc => {
      const data = doc.data();
      return new Subscription(
        data.id,
        data.profileId,
        data.plan,
        data.status,
        data.startDate,
        data.endDate,
        data.amount,
        data.createdAt
      );
    });
  }

  async findExpired(): Promise<Subscription[]> {
    const now = new Date();
    const query = await this.firestoreClient
      .collection(this.collection)
      .where('status', '==', 'active')
      .where('endDate', '<', now)
      .get();

    return query.docs.map(doc => {
      const data = doc.data();
      return new Subscription(
        data.id,
        data.profileId,
        data.plan,
        data.status,
        data.startDate,
        data.endDate,
        data.amount,
        data.createdAt
      );
    });
  }

  async cancel(id: string): Promise<void> {
    await this.firestoreClient
      .collection(this.collection)
      .doc(id)
      .update({
        status: 'cancelled',
        updatedAt: new Date()
      });
  }

  async renew(id: string, newEndDate: Date, amount: number): Promise<void> {
    await this.firestoreClient
      .collection(this.collection)
      .doc(id)
      .update({
        endDate: newEndDate,
        amount,
        status: 'active',
        updatedAt: new Date()
      });
  }
}
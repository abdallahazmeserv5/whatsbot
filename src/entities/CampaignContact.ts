import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Campaign } from "./Campaign";

export type CampaignContactStatus =
  | "pending"
  | "queued"
  | "sent"
  | "delivered"
  | "read"
  | "failed";

@Entity("campaign_contacts")
@Index(["campaignId", "status"])
@Index(["phoneNumber"])
export class CampaignContact {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  campaignId!: string;

  @ManyToOne(() => Campaign, { onDelete: "CASCADE" })
  @JoinColumn({ name: "campaignId" })
  campaign!: Campaign;

  @Column()
  phoneNumber!: string;

  // Personalization Data
  @Column({ type: "simple-json", default: "{}" })
  variables!: Record<string, string>; // {name: "John", company: "Acme"}

  // Processing
  @Column({
    type: "enum",
    enum: ["pending", "queued", "sent", "delivered", "read", "failed"],
    default: "pending",
  })
  status!: CampaignContactStatus;

  @Column({ nullable: true })
  assignedSenderId!: string | null;

  // Attempts
  @Column({ type: "int", default: 0 })
  attemptCount!: number;

  @Column({ type: "timestamp", nullable: true })
  lastAttempt!: Date | null;

  @Column({ type: "text", nullable: true })
  errorMessage!: string | null;

  // Timestamps
  @Column({ type: "timestamp", nullable: true })
  queuedAt!: Date | null;

  @Column({ type: "timestamp", nullable: true })
  sentAt!: Date | null;

  @Column({ type: "timestamp", nullable: true })
  deliveredAt!: Date | null;

  @Column({ type: "timestamp", nullable: true })
  readAt!: Date | null;

  @Column({ type: "timestamp", nullable: true })
  failedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;
}

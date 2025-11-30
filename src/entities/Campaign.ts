import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from "typeorm";

export type CampaignStatus =
  | "draft"
  | "scheduled"
  | "running"
  | "paused"
  | "completed"
  | "failed";

export type MediaType = "image" | "video" | "document" | null;

@Entity("campaigns")
@Index(["status", "createdAt"])
export class Campaign {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  name!: string;

  @Column({
    type: "enum",
    enum: ["draft", "scheduled", "running", "paused", "completed", "failed"],
    default: "draft",
  })
  status!: CampaignStatus;

  // Message Content
  @Column({ type: "text" })
  template!: string; // Message with {{variables}}

  @Column({ type: "text", nullable: true })
  mediaUrl!: string | null;

  @Column({
    type: "enum",
    enum: ["image", "video", "document"],
    nullable: true,
  })
  mediaType!: MediaType;

  // Recipients
  @Column({ type: "int", default: 0 })
  totalRecipients!: number;

  @Column({ type: "int", default: 0 })
  processedCount!: number;

  @Column({ type: "int", default: 0 })
  successCount!: number;

  @Column({ type: "int", default: 0 })
  failedCount!: number;

  // Scheduling
  @Column({ type: "timestamp", nullable: true })
  scheduledStart!: Date | null;

  @Column({ type: "timestamp", nullable: true })
  scheduledEnd!: Date | null;

  @Column({ type: "time", nullable: true })
  timeWindowStart!: string | null; // "09:00"

  @Column({ type: "time", nullable: true })
  timeWindowEnd!: string | null; // "18:00"

  @Column({ default: "UTC" })
  timezone!: string;

  // Behavior Settings
  @Column({ type: "int", default: 2000 })
  minDelay!: number; // milliseconds

  @Column({ type: "int", default: 5000 })
  maxDelay!: number; // milliseconds

  @Column({ default: true })
  enableTyping!: boolean;

  @Column({ default: false })
  enableReadReceipts!: boolean;

  // Sender Assignment
  @Column({ type: "simple-array", nullable: true })
  senderIds!: string[] | null; // Specific senders, or null for auto

  // Metadata
  @Column({ nullable: true })
  createdBy!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ type: "timestamp", nullable: true })
  startedAt!: Date | null;

  @Column({ type: "timestamp", nullable: true })
  completedAt!: Date | null;
}

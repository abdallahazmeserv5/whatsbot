import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

export type SenderStatus = "connected" | "disconnected" | "banned" | "paused";

@Entity("senders")
@Index(["status", "isActive", "healthScore"])
export class Sender {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ unique: true })
  name!: string;

  @Column({ unique: true })
  phoneNumber!: string;

  @Column({
    type: "enum",
    enum: ["connected", "disconnected", "banned", "paused"],
    default: "disconnected",
  })
  status!: SenderStatus;

  // Session Data
  @Column({ type: "text", nullable: true })
  sessionData!: string | null; // Encrypted Baileys session JSON

  @Column({ type: "text", nullable: true })
  qrCode!: string | null;

  @Column({ type: "timestamp", nullable: true })
  lastConnected!: Date | null;

  // Quotas
  @Column({ default: 20 })
  quotaPerMinute!: number;

  @Column({ default: 500 })
  quotaPerHour!: number;

  @Column({ default: 5000 })
  quotaPerDay!: number;

  // Current Usage
  @Column({ default: 0 })
  sentThisMinute!: number;

  @Column({ default: 0 })
  sentThisHour!: number;

  @Column({ default: 0 })
  sentThisDay!: number;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  lastResetMinute!: Date;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  lastResetHour!: Date;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  lastResetDay!: Date;

  // Health Metrics
  @Column({ type: "int", default: 100 })
  healthScore!: number; // 0-100

  @Column({ type: "int", default: 0 })
  failureCount!: number;

  @Column({ type: "int", default: 0 })
  successCount!: number;

  @Column({ type: "timestamp", nullable: true })
  lastFailure!: Date | null;

  @Column({ type: "int", default: 0 })
  consecutiveFailures!: number;

  @Column({ type: "timestamp", nullable: true })
  lastUsed!: Date | null;

  // Metadata
  @Column({ default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

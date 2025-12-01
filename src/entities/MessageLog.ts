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
import { CampaignContact } from "./CampaignContact";
import { Sender } from "./Sender";

export type MessageStatus = "sent" | "delivered" | "read" | "failed";

@Entity("message_logs")
@Index(["campaignId", "createdAt"])
@Index(["senderId", "createdAt"])
@Index(["status"])
export class MessageLog {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ nullable: true })
  campaignId!: string;

  @ManyToOne(() => Campaign, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "campaignId" })
  campaign!: Campaign;

  @Column({ nullable: true })
  contactId!: string;

  @ManyToOne(() => CampaignContact, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "contactId" })
  contact!: CampaignContact;

  @Column({ nullable: true })
  phoneNumber!: string;

  @Column()
  senderId!: string;

  @ManyToOne(() => Sender)
  @JoinColumn({ name: "senderId" })
  sender!: Sender;

  @Column({ type: "text" })
  message!: string;

  @Column({
    type: "enum",
    enum: ["sent", "delivered", "read", "failed"],
    default: "sent",
  })
  status!: MessageStatus;

  @CreateDateColumn()
  sentAt!: Date;

  @Column({ type: "timestamp", nullable: true })
  deliveredAt!: Date | null;

  @Column({ type: "timestamp", nullable: true })
  readAt!: Date | null;

  @Column({ type: "text", nullable: true })
  error!: string | null;

  @Column({ type: "simple-json", nullable: true })
  metadata!: any;
}

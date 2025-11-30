import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from "typeorm";

export type BlocklistReason = "opt_out" | "spam" | "manual";

@Entity("blocklist")
@Index(["phoneNumber"], { unique: true })
export class Blocklist {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ unique: true })
  phoneNumber!: string;

  @Column({
    type: "enum",
    enum: ["opt_out", "spam", "manual"],
    default: "manual",
  })
  reason!: BlocklistReason;

  @CreateDateColumn()
  addedAt!: Date;

  @Column({ type: "text", nullable: true })
  notes!: string | null;
}

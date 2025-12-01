import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity()
export class AutoReplyConfig {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ default: false })
  isActive!: boolean;

  @Column({ type: "varchar", length: 255, default: "" })
  senderNumber!: string;

  @Column({ type: "text" })
  messageContent!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity()
export class Contact {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ unique: true })
  phoneNumber!: string; // E.164 format

  @Column({ nullable: true })
  name!: string;

  @Column("simple-json", { default: "{}" })
  customAttributes!: Record<string, any>;

  @Column({ default: false })
  isAutoReplyDisabled!: boolean;

  @Column({ type: "datetime", nullable: true })
  autoReplyDisabledUntil!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

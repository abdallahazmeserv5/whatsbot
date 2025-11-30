import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { BroadcastList } from "./BroadcastList";

@Entity()
export class BroadcastGroup {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  broadcastListId!: string;

  @ManyToOne(() => BroadcastList, (list) => list.groups, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "broadcastListId" })
  broadcastList!: BroadcastList;

  @Column({ nullable: true })
  broadcastJid!: string;

  @Column("simple-array")
  members!: string[];

  @Column({ type: "int" })
  memberCount!: number;

  @CreateDateColumn()
  createdAt!: Date;
}

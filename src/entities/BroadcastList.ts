import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { BroadcastGroup } from "./BroadcastGroup";

@Entity()
export class BroadcastList {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  name!: string;

  @Column()
  sessionId!: string;

  @Column({ type: "int", default: 0 })
  totalMembers!: number;

  @OneToMany(() => BroadcastGroup, (group) => group.broadcastList, {
    cascade: true,
  })
  groups!: BroadcastGroup[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

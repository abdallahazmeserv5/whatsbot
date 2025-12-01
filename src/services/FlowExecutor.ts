import { AppDataSource } from "../data-source";
import { FlowExecution } from "../entities/FlowExecution";
import { Flow } from "../entities/Flow";
import { Contact } from "../entities/Contact";
import { WhatsAppManager } from "../WhatsAppManager";
import { flowQueue } from "../queues/flowQueue";
import axios from "axios";
import nodemailer from "nodemailer";

export class FlowExecutor {
  private get executionRepo() {
    return AppDataSource.getRepository(FlowExecution);
  }

  private get contactRepo() {
    return AppDataSource.getRepository(Contact);
  }

  private whatsappManager: WhatsAppManager;
  private emailTransporter: nodemailer.Transporter | null = null;

  constructor(manager: WhatsAppManager) {
    this.whatsappManager = manager;
    this.initializeEmailTransporter();
  }

  private initializeEmailTransporter() {
    // Initialize email transporter with environment variables
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (smtpHost && smtpUser && smtpPass) {
      this.emailTransporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort || "587"),
        secure: false, // true for 465, false for other ports
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });
      console.log("Email transporter initialized");
    } else {
      console.warn(
        "Email credentials not configured. EmailNode will not work."
      );
    }
  }

  async handleIncomingMessage(sessionId: string, from: string, text: string) {
    const phoneNumber = from.replace("@s.whatsapp.net", "");

    let contact = await this.contactRepo.findOne({ where: { phoneNumber } });
    if (!contact) {
      contact = this.contactRepo.create({ phoneNumber, name: "Unknown" });
      await this.contactRepo.save(contact);
    }

    const flows = await AppDataSource.getRepository(Flow).find({
      where: { isActive: true, triggerType: "keyword" },
    });

    for (const flow of flows) {
      if (
        flow.keywords &&
        flow.keywords.some((k) => text.toLowerCase().includes(k.toLowerCase()))
      ) {
        console.log(`Triggering flow ${flow.name} for ${phoneNumber}`);
        await this.startFlow(flow.id, contact.id, { sessionId, message: text });
        return;
      }
    }
  }

  async startFlow(flowId: string, contactId: string, triggerData: any = {}) {
    const flow = await AppDataSource.getRepository(Flow).findOne({
      where: { id: flowId },
    });
    const contact = await this.contactRepo.findOne({
      where: { id: contactId },
    });

    if (!flow || !contact || !flow.isActive) return;

    const startNode = flow.nodes.find((n: any) => n.type === "start");
    if (!startNode) return;

    const execution = this.executionRepo.create({
      flow,
      contact,
      currentNodeId: startNode.id,
      variables: { ...triggerData },
      status: "running",
    });

    await this.executionRepo.save(execution);
    await this.executeNode(execution.id, startNode.id);
  }

  async executeNode(executionId: string, nodeId: string) {
    const execution = await this.executionRepo.findOne({
      where: { id: executionId },
      relations: ["flow", "contact"],
    });

    if (!execution || execution.status !== "running") return;

    const node = execution.flow.nodes.find((n: any) => n.id === nodeId);
    if (!node) {
      await this.completeExecution(executionId);
      return;
    }

    try {
      switch (node.type) {
        case "message":
          await this.handleMessageNode(node, execution);
          break;
        case "condition":
          await this.handleConditionNode(node, execution);
          return;
        case "delay":
          await this.handleDelayNode(node, execution);
          return;
        case "http":
          await this.handleHttpRequestNode(node, execution);
          break;
        case "email":
          await this.handleEmailNode(node, execution);
          break;
      }

      if (node.type !== "condition" && node.type !== "delay") {
        const nextNodeId = this.getNextNodeId(execution.flow, nodeId);
        if (nextNodeId) {
          execution.currentNodeId = nextNodeId;
          await this.executionRepo.save(execution);
          await this.executeNode(executionId, nextNodeId);
        } else {
          await this.completeExecution(executionId);
        }
      }
    } catch (error) {
      console.error(`Error executing node ${nodeId}:`, error);
      execution.status = "failed";
      await this.executionRepo.save(execution);
    }
  }

  private async handleMessageNode(node: any, execution: FlowExecution) {
    const messageText = this.parseVariables(node.data.text, execution);
    const sessionId = execution.variables.sessionId;

    if (sessionId) {
      await this.whatsappManager.sendMessage(
        sessionId,
        execution.contact.phoneNumber,
        messageText
      );
    } else {
      console.warn("No session ID found for execution", execution.id);
    }
  }

  private async handleConditionNode(node: any, execution: FlowExecution) {
    const conditionKeyword = node.data.condition?.toLowerCase() || "";
    const incomingMessage = execution.variables.message?.toLowerCase() || "";

    const isTrue = incomingMessage.includes(conditionKeyword);
    console.log(
      `Condition Node ${node.id}: "${incomingMessage}" includes "${conditionKeyword}"? ${isTrue}`
    );

    const edges = execution.flow.edges;
    const nextEdge = edges.find(
      (edge: any) =>
        edge.source === node.id &&
        edge.sourceHandle === (isTrue ? "true" : "false")
    );

    if (nextEdge) {
      const nextNodeId = nextEdge.target;
      execution.currentNodeId = nextNodeId;
      await this.executionRepo.save(execution);
      await this.executeNode(execution.id, nextNodeId);
    } else {
      console.log(
        `No edge found for condition result ${isTrue} from node ${node.id}`
      );
      await this.completeExecution(execution.id);
    }
  }

  private async handleDelayNode(node: any, execution: FlowExecution) {
    const delaySeconds = parseInt(node.data.delay || "5");
    console.log(
      `Delay Node ${node.id}: Scheduling next execution in ${delaySeconds} seconds`
    );

    const nextNodeId = this.getNextNodeId(execution.flow, node.id);
    if (nextNodeId) {
      if (flowQueue) {
        await flowQueue.add(
          "execute-node",
          { executionId: execution.id, nodeId: nextNodeId },
          { delay: delaySeconds * 1000 }
        );
      } else {
        console.log("Queue disabled, skipping delayed node scheduling.");
      }

      execution.currentNodeId = nextNodeId;
      await this.executionRepo.save(execution);
    } else {
      await this.completeExecution(execution.id);
    }
  }

  private async handleHttpRequestNode(node: any, execution: FlowExecution) {
    const method = (node.data.method || "GET").toUpperCase();
    const url = this.parseVariables(node.data.url || "", execution);
    const headers = node.data.headers || {};
    const body = node.data.body
      ? JSON.parse(this.parseVariables(node.data.body, execution))
      : undefined;

    console.log(`HTTP Request Node ${node.id}: ${method} ${url}`);

    try {
      const response = await axios({
        method,
        url,
        headers,
        data: body,
        timeout: 30000,
      });

      execution.variables.httpResponse = response.data;
      execution.variables.httpStatus = response.status;
      await this.executionRepo.save(execution);

      console.log(`HTTP Request successful: ${response.status}`);
    } catch (error: any) {
      console.error(`HTTP Request failed:`, error.message);
      execution.variables.httpError = error.message;
      execution.variables.httpStatus = error.response?.status || 0;
      await this.executionRepo.save(execution);
    }
  }

  private async handleEmailNode(node: any, execution: FlowExecution) {
    if (!this.emailTransporter) {
      console.error("Email transporter not configured");
      execution.variables.emailError = "Email not configured";
      await this.executionRepo.save(execution);
      return;
    }

    const to = this.parseVariables(node.data.to || "", execution);
    const subject = this.parseVariables(
      node.data.subject || "No Subject",
      execution
    );
    const body = this.parseVariables(node.data.body || "", execution);
    const from = process.env.SMTP_USER || "noreply@example.com";

    console.log(`Email Node ${node.id}: Sending to ${to}`);

    try {
      const info = await this.emailTransporter.sendMail({
        from,
        to,
        subject,
        text: body,
        html: body.replace(/\n/g, "<br>"),
      });

      execution.variables.emailMessageId = info.messageId;
      execution.variables.emailSent = true;
      await this.executionRepo.save(execution);

      console.log(`Email sent successfully: ${info.messageId}`);
    } catch (error: any) {
      console.error(`Email failed:`, error.message);
      execution.variables.emailError = error.message;
      execution.variables.emailSent = false;
      await this.executionRepo.save(execution);
    }
  }

  private getNextNodeId(flow: Flow, currentNodeId: string): string | null {
    const edge = flow.edges.find((e: any) => e.source === currentNodeId);
    return edge ? edge.target : null;
  }

  private async completeExecution(executionId: string) {
    await this.executionRepo.update(executionId, { status: "completed" });
  }

  private parseVariables(text: string, execution: FlowExecution): string {
    return text.replace(/\{\{(.*?)\}\}/g, (_, key) => {
      return this.getVariableValue(key.trim(), execution);
    });
  }

  private getVariableValue(key: string, execution: FlowExecution): any {
    const [scope, field] = key.split(".");
    if (scope === "contact") return (execution.contact as any)[field];
    if (scope === "flow") return execution.variables[field];
    return "";
  }
}

const API_URL = "http://localhost:3000";

export async function saveFlow(
  name: string,
  nodes: any[],
  edges: any[],
  triggerType: string,
  keywords: string[]
) {
  const response = await fetch(`${API_URL}/flows`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      nodes,
      edges,
      triggerType,
      keywords,
      isActive: true,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to save flow");
  }

  return response.json();
}

export async function getFlows() {
  const response = await fetch(`${API_URL}/flows`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch flows");
  }

  return response.json();
}

export async function toggleFlow(flowId: string) {
  const response = await fetch(`${API_URL}/flows/${flowId}/toggle`, {
    method: "PATCH",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to toggle flow");
  }

  return response.json();
}

export async function getFlowExecutions(flowId: string) {
  const response = await fetch(`${API_URL}/flows/${flowId}/executions`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch executions");
  }

  return response.json();
}

import { ReeldiffError } from "../errors.ts";
import { counts, formatSeconds, type Notifier, type RunReport, shownFlows } from "./notifier.ts";

const clip = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max - 1)}…` : text;

const escapeMrkdwn = (text: string) =>
  text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

type Block = Record<string, unknown>;

export function slackMessage(report: RunReport): { text: string; blocks: Block[] } {
  const { manifest } = report;
  const pr = manifest.pr;
  const title = pr
    ? `🎬 ${pr.title} (#${pr.number})`
    : `🎬 ${manifest.summary?.headline ?? "UI changes"}`;
  const blocks: Block[] = [
    { type: "header", text: { type: "plain_text", text: clip(title, 150) } },
  ];

  const lines = [
    manifest.summary?.headline && pr ? `*${escapeMrkdwn(manifest.summary.headline)}*` : undefined,
    ...(manifest.summary?.bullets ?? []).map((bullet) => `• ${escapeMrkdwn(bullet)}`),
  ].filter(Boolean);
  if (lines.length) {
    blocks.push({ type: "section", text: { type: "mrkdwn", text: clip(lines.join("\n"), 3000) } });
  }

  const first = shownFlows(manifest).find((flow) => flow.poster);
  const poster = report.assetUrl(first?.poster);
  if (first && poster?.startsWith("https://")) {
    blocks.push({
      type: "image",
      image_url: poster,
      alt_text: clip(`${first.title}, final screen`, 2000),
      title: { type: "plain_text", text: clip(first.title, 2000) },
    });
  }

  const buttons = [
    report.runUrl && {
      type: "button",
      text: { type: "plain_text", text: "Watch demo" },
      url: report.runUrl,
      style: "primary",
    },
    pr?.url && { type: "button", text: { type: "plain_text", text: "Open PR" }, url: pr.url },
  ].filter(Boolean);
  if (buttons.length) blocks.push({ type: "actions", elements: buttons });

  const n = counts(manifest);
  const footer = [
    `${n.total} flow${n.total === 1 ? "" : "s"} affected`,
    n.changed ? `${n.changed} changed` : undefined,
    n.new ? `${n.new} new` : undefined,
    n.broken ? `⚠️ ${n.broken} broken` : undefined,
    `ran in ${formatSeconds(manifest.durationMs)}`,
  ].filter(Boolean);
  blocks.push({ type: "context", elements: [{ type: "mrkdwn", text: footer.join(" · ") }] });

  const fallback = pr
    ? `${pr.title} (#${pr.number}): ${manifest.summary?.headline ?? "UI changes"}`
    : title;
  return { text: clip(fallback, 3000), blocks };
}

export function slackNotifier(webhookUrl: string): Notifier {
  return {
    name: "slack",
    async send(report) {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(slackMessage(report)),
      });
      if (!response.ok) {
        throw new ReeldiffError(
          `Slack rejected the message (${response.status}). Check the webhook URL.`,
        );
      }
    },
  };
}

"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { getLlmConfig, updateLlmConfig, type LlmConfig } from "@/lib/agent-service-config"

const EMPTY_CONFIG: LlmConfig = {
  base_url: "",
  api_key: "",
  model: "",
  timeout: 30,
}

const MODEL_PRESETS = {
  international: [
    { label: "OpenAI gpt-4o-mini", value: "gpt-4o-mini" },
    { label: "OpenAI gpt-4o", value: "gpt-4o" },
    { label: "OpenAI gpt-4.1-mini", value: "gpt-4.1-mini" },
  ],
  domestic: [
    { label: "通义 qwen2.5-7b-instruct", value: "qwen2.5-7b-instruct" },
    { label: "通义 qwen2.5-14b-instruct", value: "qwen2.5-14b-instruct" },
    { label: "通义 qwen-max", value: "qwen-max" },
    { label: "智谱 glm-4", value: "glm-4" },
    { label: "DeepSeek deepseek-chat", value: "deepseek-chat" },
    { label: "DeepSeek deepseek-reasoner", value: "deepseek-reasoner" },
  ],
}

const PRESET_VALUES = new Set([
  ...MODEL_PRESETS.international.map((item) => item.value),
  ...MODEL_PRESETS.domestic.map((item) => item.value),
])

export function SettingsClient() {
  const [form, setForm] = React.useState<LlmConfig>(EMPTY_CONFIG)
  const [loading, setLoading] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [saved, setSaved] = React.useState<string | null>(null)
  const [showKey, setShowKey] = React.useState(false)

  const modelSelectValue = React.useMemo(() => {
    return PRESET_VALUES.has(form.model) ? form.model : "__custom__"
  }, [form.model])

  React.useEffect(() => {
    let alive = true
    async function load() {
      setLoading(true)
      try {
        const data = await getLlmConfig()
        if (!alive) return
        setForm({
          base_url: data.base_url ?? "",
          api_key: data.api_key ?? "",
          model: data.model ?? "",
          timeout: data.timeout ?? 30,
        })
        setError(null)
      } catch (e) {
        if (!alive) return
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => {
      alive = false
    }
  }, [])

  async function save() {
    setSaving(true)
    setSaved(null)
    try {
      const data = await updateLlmConfig({
        base_url: form.base_url.trim(),
        api_key: form.api_key,
        model: form.model.trim(),
        timeout: Number(form.timeout) || 30,
      })
      setForm({
        base_url: data.base_url ?? "",
        api_key: data.api_key ?? "",
        model: data.model ?? "",
        timeout: data.timeout ?? 30,
      })
      setError(null)
      setSaved("已保存")
      setTimeout(() => setSaved(null), 1500)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">设置</div>
        <h1 className="text-2xl font-semibold tracking-tight">LLM 配置</h1>
        <p className="text-sm text-muted-foreground">
          这里配置 Agent Service 使用的 LLM 连接参数，将写入服务端配置文件。
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">连接信息</CardTitle>
          <CardDescription>支持 OpenAI 兼容的 Chat Completions 接口</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <div className="rounded-md border bg-muted/20 p-3 text-sm text-muted-foreground">
              {error}
            </div>
          ) : null}
          {saved ? (
            <div className="rounded-md border bg-primary/10 p-2 text-xs text-primary">{saved}</div>
          ) : null}

          <div className="space-y-2">
            <div className="text-sm font-medium">Base URL</div>
            <Input
              value={form.base_url}
              onChange={(e) => setForm((prev) => ({ ...prev, base_url: e.target.value }))}
              placeholder="http://localhost:8000"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">API Key</div>
            <Input
              type={showKey ? "text" : "password"}
              value={form.api_key}
              onChange={(e) => setForm((prev) => ({ ...prev, api_key: e.target.value }))}
              placeholder="sk-..."
              disabled={loading}
            />
            <div className="text-xs text-muted-foreground">
              <button
                type="button"
                className="underline underline-offset-4"
                onClick={() => setShowKey((v) => !v)}
              >
                {showKey ? "隐藏" : "显示"} Key
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Model</div>
            <select
              value={modelSelectValue}
              onChange={(e) => {
                const value = e.target.value
                if (value === "__custom__") return
                setForm((prev) => ({ ...prev, model: value }))
              }}
              className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              disabled={loading}
            >
              <optgroup label="国外">
                {MODEL_PRESETS.international.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="国内">
                {MODEL_PRESETS.domestic.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </optgroup>
              <option value="__custom__">自定义</option>
            </select>
            {modelSelectValue === "__custom__" ? (
              <Input
                value={form.model}
                onChange={(e) => setForm((prev) => ({ ...prev, model: e.target.value }))}
                placeholder="输入自定义模型名"
                disabled={loading}
              />
            ) : (
              <div className="text-xs text-muted-foreground">如需自定义模型，请选择“自定义”。</div>
            )}
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Timeout (秒)</div>
            <Input
              type="number"
              min={5}
              value={form.timeout}
              onChange={(e) => setForm((prev) => ({ ...prev, timeout: Number(e.target.value) }))}
              disabled={loading}
            />
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={save} disabled={loading || saving}>
              {saving ? "保存中…" : "保存配置"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

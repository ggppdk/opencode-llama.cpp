import {ModelStatusCache} from '../cache/model-status-cache'
import {ToastNotifier} from '../ui/toast-notifier'
import {categorizeModel, extractModelOwner, formatModelName} from '../utils'
import {autoDetectLlamaCpp, checkLlamaCppHealth, discoverLlamaCppModels, getLlamaCppModelContextSize, normalizeBaseURL} from '../utils/llama-cpp-api'
import {getLlamaCppProviderEntries} from '../utils/validation'
import type {PluginInput} from '@opencode-ai/plugin'
import type {LlamaCppModel} from '../types'

const modelStatusCache = new ModelStatusCache()

export async function enhanceConfig(
    config: any,
    _client: PluginInput['client'], // client not used but kept for interface compatibility
    toastNotifier: ToastNotifier
): Promise<void> {
    try {
        let providerEntries = getLlamaCppProviderEntries(config)

        if (providerEntries.length === 0) {
            // Try to auto-detect llama.cpp
            const detectedURL = await autoDetectLlamaCpp()
            if (!detectedURL) {
                return // No llama.cpp found
            }

            // Auto-create llama.cpp provider if detected
            if (!config.provider) {
                config.provider = {}
            }
            config.provider['llama.cpp'] = {
                npm: "@ai-sdk/openai-compatible",
                name: "llama.cpp (local)",
                options: {
                    baseURL: `${detectedURL}/v1`,
                },
                models: {},
            }
            providerEntries = getLlamaCppProviderEntries(config)
        }

        for (const [providerId, llamaCppProvider] of providerEntries) {
            const baseURL = normalizeBaseURL(llamaCppProvider.options?.baseURL || "http://127.0.0.1:1234")

            // Check health first
            const isHealthy = await checkLlamaCppHealth(baseURL)
            if (!isHealthy) {
                console.warn("[opencode-llama-cpp] llama.cpp appears to be offline", {providerId, baseURL})
                continue
            }

            // Try to discover models from llama.cpp API
            let models: LlamaCppModel[]
            try {
                models = await discoverLlamaCppModels(baseURL)
            } catch (error) {
                console.warn("[opencode-llama-cpp] Model discovery failed", {
                    providerId,
                    error: error instanceof Error ? error.message : String(error)
                })
                continue
            }

            if (models.length > 0) {
                // Merge discovered models with configured models
                const existingModels = llamaCppProvider.models || {}
                const discoveredModels: Record<string, any> = {}
                let chatModelsCount = 0
                let embeddingModelsCount = 0

                for (const model of models) {
                    // Use model ID as key directly for better readability, fallback to sanitized version
                    let modelKey = model.id
                    if (!/^[a-zA-Z0-9_-]+$/.test(modelKey)) {
                        modelKey = model.id.replace(/[^a-zA-Z0-9_-]/g, "_")
                    }

                    const contextSize = getLlamaCppModelContextSize(model)
                    const inputModalities = model.architecture?.input_modalities || ["text"]
                    const outputModalities = model.architecture?.output_modalities || ["text"]

                    // Only add if not already configured
                    if (!existingModels[modelKey] && !existingModels[model.id]) {
                        const modelType = categorizeModel(model.id)
                        const owner = extractModelOwner(model.id)
                        const modelConfig: any = {
                            id: model.id,
                            name: formatModelName(model),
                            modalities: {
                                input: inputModalities,
                                output: outputModalities
                            },
                        }

                        // Add owner if available
                        if (owner) {
                            modelConfig.organizationOwner = owner
                        }

                        // Add additional metadata based on model type
                        if (modelType === 'embedding') {
                            embeddingModelsCount++
                        } else if (modelType === 'chat') {
                            chatModelsCount++
                        }

                        if (contextSize) {
                            modelConfig.limit = {
                                context: contextSize,
                            }
                        }

                        discoveredModels[modelKey] = modelConfig
                    } else {
                        const existingModelKey = existingModels[modelKey] ? modelKey : model.id
                        const existingModel = existingModels[existingModelKey]
                        if (existingModel) {
                            const nextModel = {...existingModel}

                            if (contextSize && !existingModel.limit?.context) {
                                nextModel.limit = {
                                    ...existingModel.limit,
                                    context: contextSize,
                                }
                            }

                            if (!existingModel.modalities?.input || !existingModel.modalities?.output) {
                                nextModel.modalities = {
                                    input: existingModel.modalities?.input || inputModalities,
                                    output: existingModel.modalities?.output || outputModalities,
                                }
                            }

                            existingModels[existingModelKey] = nextModel
                        }
                    }
                }

                // Merge discovered models into config
                if (Object.keys(discoveredModels).length > 0) {
                    if (!config.provider[providerId]) {
                        continue
                    }

                    config.provider[providerId].models = {
                        ...existingModels,
                        ...discoveredModels,
                    }

                    // Provide helpful guidance if no chat models are available
                    if (chatModelsCount === 0 && embeddingModelsCount > 0) {
                        console.warn("[opencode-llama-cpp] Only embedding models found. To use chat models:", {
                            providerId,
                            steps: [
                                "1. Start the llama.cpp server",
                                "2. Load a chat model",
                                "3. Ensure the server is running"
                            ]
                        })
                    }
                }
            } else {
                console.warn("[opencode-llama-cpp] No models found in llama.cpp. Please:", {
                    providerId,
                    steps: [
                        "1. Start the llama.cpp server",
                        "2. Load a model",
                        "3. Ensure the server is running"
                    ]
                })
            }

            // Warm up the cache with current model status
            try {
                await modelStatusCache.getModels(baseURL, async () => {
                    return await discoverLlamaCppModels(baseURL).then(models => models.map(m => m.id))
                })
            } catch {
                // Cache warming failed, but not critical
            }
        }
    } catch (error) {
        console.error("[opencode-llama-cpp] Unexpected error in enhanceConfig:", error)
        toastNotifier.warning("Plugin configuration failed", "Configuration Error").catch(() => {
        })
    }
}

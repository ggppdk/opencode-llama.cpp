export const LLAMA_CPP_PROVIDER_PREFIX = 'llama.cpp'

export function isPluginHookInput(input: any): input is {
    sessionID?: string;
    agent?: string;
    model?: any;
    provider?: any;
    message?: any;
    event?: any
} {
    return input && typeof input === 'object'
}

export function isLlamaCppProviderId(providerId: any): providerId is string {
    return typeof providerId === 'string' &&
        providerId.startsWith(LLAMA_CPP_PROVIDER_PREFIX)
}

export function isLlamaCppProvider(provider: any): boolean {
    return provider &&
        typeof provider === 'object' &&
        provider.info &&
        isLlamaCppProviderId(provider.info.id)
}

export function getLlamaCppProviderEntries(config: any): Array<[string, any]> {
    if (!config?.provider || typeof config.provider !== 'object') {
        return []
    }

    return Object.entries(config.provider).filter(([providerId, providerConfig]) => {
        if (isLlamaCppProviderId(providerId)) {
            return true
        }

        const candidate = providerConfig as {name?: unknown} | null
        return candidate !== null &&
            typeof candidate === 'object' &&
            isLlamaCppProviderId(candidate.name)
    })
}

export function isValidModel(model: any): model is { id: string; [key: string]: any } {
    return model &&
        typeof model === 'object' &&
        typeof model.id === 'string' &&
        model.id.length > 0
}

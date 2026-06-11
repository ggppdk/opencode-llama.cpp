import {getLlamaCppProviderEntries} from './type-guards'
import type {ValidationResult} from './validation-result'

export function validateConfig(config: any): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    if (!config || typeof config !== 'object') {
        errors.push('Config must be an object')
        return {isValid: false, errors, warnings}
    }

    // Validate provider configuration
    if (config.provider && typeof config.provider === 'object') {
        const llamaCppProviders = getLlamaCppProviderEntries(config)
        for (const [providerId, llamaCpp] of llamaCppProviders) {
            if (!llamaCpp.npm) {
                llamaCpp.npm = "@ai-sdk/openai-compatible"
                warnings.push(`${providerId} provider missing npm field, auto-set to @ai-sdk/openai-compatible`)
            }
            if (!llamaCpp.name) {
                llamaCpp.name = providerId
                warnings.push(`${providerId} provider missing name field, auto-set to "${providerId}"`)
            }
            if (!llamaCpp.options) {
                llamaCpp.options = {}
                warnings.push(`${providerId} provider missing options field, auto-created empty options`)
            }
            if (!llamaCpp.options.baseURL) {
                warnings.push(`${providerId} provider missing baseURL, will use default`)
            } else if (typeof llamaCpp.options.baseURL !== 'string') {
                errors.push(`${providerId} provider baseURL must be a string`)
            } else if (!isValidURL(llamaCpp.options.baseURL)) {
                warnings.push(`${providerId} provider baseURL may be invalid`)
            }
            if (llamaCpp.models && typeof llamaCpp.models !== 'object') {
                errors.push(`${providerId} provider models must be an object`)
            }
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    }
}

function isValidURL(url: string): boolean {
    try {
        new URL(url)
        return true
    } catch {
        return false
    }
}

import { test } from '@japa/runner'
import {
  AI_MODELS_BY_PROVIDER,
  AI_PROVIDERS,
  AI_PROVIDER_LABELS,
  ALL_AI_MODELS,
  DEFAULT_AI_MODEL_BY_PROVIDER,
  aiModelI18nKey,
  isAiProvider,
  modelBelongsToProvider,
} from '#shared/types/ai'

test.group('AI providers taxonomy', () => {
  test('every provider has a label, a model list and a default model', ({ assert }) => {
    for (const provider of AI_PROVIDERS) {
      assert.property(AI_PROVIDER_LABELS, provider)
      assert.isNotEmpty(AI_MODELS_BY_PROVIDER[provider])
      // Le défaut doit appartenir à la liste du fournisseur — c'est lui qui
      // sert de repli quand `aiModelOverride` est étranger au fournisseur.
      assert.include(AI_MODELS_BY_PROVIDER[provider], DEFAULT_AI_MODEL_BY_PROVIDER[provider])
    }
  })

  test('model ids are globally unique across providers', ({ assert }) => {
    assert.equal(new Set(ALL_AI_MODELS).size, ALL_AI_MODELS.length)
  })

  test('modelBelongsToProvider rejects a model from another provider', ({ assert }) => {
    assert.isTrue(modelBelongsToProvider('claude-opus-5', 'anthropic'))
    // Un `aiModelOverride` Claude hérité ne doit jamais partir chez Mistral :
    // AiService retombe alors sur le défaut du fournisseur de l'appel.
    assert.isFalse(modelBelongsToProvider('claude-opus-5', 'mistral'))
    assert.isFalse(modelBelongsToProvider('mistral-large-latest', 'openai'))
  })

  test('isAiProvider narrows only known providers', ({ assert }) => {
    assert.isTrue(isAiProvider('google'))
    assert.isFalse(isAiProvider('not-a-provider'))
    assert.isFalse(isAiProvider(null))
  })

  test('aiModelI18nKey strips dots so i18n path resolution works', ({ assert }) => {
    assert.equal(aiModelI18nKey('gpt-5.1'), 'gpt-5-1')
    assert.equal(aiModelI18nKey('mistral-small-latest'), 'mistral-small-latest')
    // Chaque modèle doit avoir sa clé sans point (sinon `t()` ne résout pas).
    for (const model of ALL_AI_MODELS) {
      assert.notInclude(aiModelI18nKey(model), '.')
    }
  })
})

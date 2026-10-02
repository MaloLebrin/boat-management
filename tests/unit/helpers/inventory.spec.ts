import { test } from '@japa/runner'
import {
  adjustmentDelta,
  effectivePartStock,
  isInventoryLow,
  isPartLow,
  purchaseOrderTotal,
  roundQuantity,
  stockValue,
  suggestedReorderQuantity,
  weightedAverageCost,
} from '#shared/helpers/inventory'

/**
 * Calculs purs de l'inventaire (#892) : prix moyen pondéré, seuils, quantité
 * à commander. Le prix moyen fixe la valeur du stock et le prix proposé sur
 * chaque bon de commande — une erreur ici se propage à toutes les commandes.
 */
test.group('inventaire — prix moyen pondéré', () => {
  test('sans prix moyen antérieur, le prix d’achat fait foi', ({ assert }) => {
    assert.equal(weightedAverageCost(0, null, 10, 12.5), 12.5)
    assert.equal(weightedAverageCost(4, null, 10, 12.5), 12.5)
  })

  test('pondère le stock détenu et la livraison', ({ assert }) => {
    // 4 filtres à 10 € + 6 à 15 € = 130 € pour 10 filtres.
    assert.equal(weightedAverageCost(4, 10, 6, 15), 13)
  })

  test('un stock négatif (sorties avant livraison) ne pèse pas', ({ assert }) => {
    assert.equal(weightedAverageCost(-2, 10, 6, 15), 15)
  })

  test('arrondi au centime', ({ assert }) => {
    assert.equal(weightedAverageCost(1, 10, 2, 10.01), 10.01)
    assert.equal(weightedAverageCost(3, 9.99, 1, 10), 9.99)
  })
})

test.group('inventaire — seuils et commandes', () => {
  test('stock bas : seuil renseigné et quantité qui l’atteint', ({ assert }) => {
    assert.isTrue(isInventoryLow(2, 2))
    assert.isTrue(isInventoryLow(-1, 0))
    assert.isFalse(isInventoryLow(3, 2))
    assert.isFalse(isInventoryLow(0, null))
  })

  test('la commande proposée remonte au double du seuil, une unité au moins', ({ assert }) => {
    assert.equal(suggestedReorderQuantity(1, 3), 5)
    assert.equal(suggestedReorderQuantity(-2, 3), 8)
    assert.equal(suggestedReorderQuantity(5.5, 3), 1)
    assert.equal(suggestedReorderQuantity(0.4, 1.2), 2)
    assert.equal(suggestedReorderQuantity(0, null), 1)
  })

  test('le comptage écrit l’écart, arrondi', ({ assert }) => {
    assert.equal(adjustmentDelta(5, 3), -2)
    assert.equal(adjustmentDelta(0.1, 0.3), 0.2)
    assert.equal(adjustmentDelta(4, 4), 0)
  })

  test('valeur du stock et total d’un bon', ({ assert }) => {
    assert.equal(stockValue(3, 12.5), 37.5)
    assert.isNull(stockValue(0, 12.5))
    assert.isNull(stockValue(3, null))
    assert.equal(
      purchaseOrderTotal([
        { quantity: 3, unitCost: 12.5 },
        { quantity: 0.5, unitCost: 10 },
      ]),
      42.5
    )
    assert.equal(roundQuantity(0.1 + 0.2), 0.3)
  })
})

test.group('inventaire — stock vu d’une pièce moteur', () => {
  const part = { stock: 7, minStockAlert: 2 }

  test('reliée, la pièce lit la quantité et le seuil de l’article', ({ assert }) => {
    assert.deepEqual(effectivePartStock(part, { quantity: 1, minQuantity: 3 }), {
      stock: 1,
      minStockAlert: 3,
      fromInventory: true,
    })
    assert.isTrue(isPartLow(part, { quantity: 1, minQuantity: 3 }))
  })

  test('non reliée, ses compteurs locaux font foi', ({ assert }) => {
    assert.deepEqual(effectivePartStock(part, null), {
      stock: 7,
      minStockAlert: 2,
      fromInventory: false,
    })
    assert.isFalse(isPartLow(part, undefined))
    assert.isTrue(isPartLow({ stock: 2, minStockAlert: 2 }, null))
  })
})

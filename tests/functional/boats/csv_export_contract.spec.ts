import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import { BoatFactory } from '#database/factories/boat_factory'
import { createAdminUser, createStarterAdminUser } from '#tests/functional/helpers'
import { DateTime } from 'luxon'

/**
 * Le contrat des quatre exports CSV (#692).
 *
 * Ces routes étaient couvertes **en damier** : chacune sur une cellule
 * différente, aucune sur les trois. `maintenance.csv` n'avait que son refus de
 * quota, `fuel-logs.csv` que son cas nominal, `navigation-logs.csv` rien du
 * tout. Une couverture en damier est pire qu'une absence de couverture : elle
 * a l'air d'exister.
 *
 * Ce fichier fige le **contrat de route** — statut, en-têtes, ligne d'en-tête
 * du CSV, refus de plan, bornage d'organisation — pour les quatre d'un coup.
 * Le **contenu métier** reste chez les specs qui le testaient déjà
 * (`budget_csv.spec.ts` pour la ligne TOTAL, `fuel_log_fuel_type.spec.ts` pour
 * la colonne carburant) : ce sont deux questions distinctes.
 */

interface ExportCase {
  /** Segment d'URL après `/boats/:id/export/`. */
  path: string
  /** Préfixe du nom de fichier produit par `csvFilename()`. */
  filenamePrefix: string
  /**
   * Ligne d'en-tête attendue, séparateur `;`. `null` quand elle est traduite
   * (budget) : on vérifie alors le nombre de colonnes, une chaîne i18n ne se
   * fige pas dans un test de contrat.
   */
  header: string | null
  /** Nombre de colonnes attendu. */
  columns: number
}

const EXPORTS: ExportCase[] = [
  {
    path: 'maintenance.csv',
    filenamePrefix: 'maintenance_',
    header: 'date;titre;sujet;notes;légende_moteur;légende_voile;coût_total',
    columns: 7,
  },
  {
    path: 'fuel-logs.csv',
    filenamePrefix: 'avitaillements_',
    header:
      'date;quantité_litres;prix_par_litre;coût_total;heures_moteur;carburant;fournisseur;notes',
    columns: 8,
  },
  {
    path: 'navigation-logs.csv',
    filenamePrefix: 'journal_de_bord_',
    header:
      'date_départ;date_arrivée;port_départ;port_arrivée;distance_nm;heures_moteur_départ;' +
      'heures_moteur_arrivée;carburant_consommé_L;vent_beaufort;état_mer;nb_équipiers;statut;notes',
    columns: 13,
  },
  {
    path: 'budget.csv',
    filenamePrefix: `budget_${DateTime.now().year}_`,
    header: null,
    columns: 8,
  },
]

/** Première ligne du CSV, BOM retiré — `buildCsv()` écrit en CRLF. */
function headerLine(csv: string): string {
  // Le BOM est comparé par code, pas par littéral : prettier réécrit un
  // `\uFEFF` échappé en caractère brut, qu'ESLint refuse ensuite.
  const withoutBom = csv.charCodeAt(0) === 0xfeff ? csv.slice(1) : csv
  return withoutBom.split('\r\n')[0]
}

test.group('CSV exports — contrat des quatre routes', (group) => {
  group.each.setup(() => truncateDb())

  for (const exportCase of EXPORTS) {
    test(`GET export/${exportCase.path} sert un CSV en plan pro`, async ({ client, assert }) => {
      const user = await createAdminUser('pro')
      const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

      const response = await client.get(`/boats/${boat.id}/export/${exportCase.path}`).loginAs(user)

      response.assertStatus(200)
      response.assertHeader('content-type', 'text/csv; charset=utf-8')

      const disposition = response.header('content-disposition')
      assert.include(disposition, `attachment; filename="${exportCase.filenamePrefix}`)
      assert.include(disposition, `${DateTime.now().toISODate()}.csv"`)
      assert.isAbove(Number(response.header('content-length')), 0)

      const line = headerLine(response.text())
      assert.lengthOf(line.split(';'), exportCase.columns)
      if (exportCase.header !== null) {
        assert.equal(line, exportCase.header)
      }
    })

    test(`GET export/${exportCase.path} est refusé en plan starter`, async ({ client }) => {
      const user = await createStarterAdminUser()
      const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

      const response = await client
        .get(`/boats/${boat.id}/export/${exportCase.path}`)
        .loginAs(user)
        .redirects(0)

      // `QuotaExceededError` est rendue par le handler global, pas par le
      // contrôleur : ni 403 ni page d'erreur, mais une redirection assortie de
      // l'upsell (#418/#685).
      response.assertStatus(302)
      response.assertFlashMessage('errorAction', '/settings/billing')
    })

    test(`GET export/${exportCase.path} refuse un bateau d'une autre organisation`, async ({
      client,
    }) => {
      const owner = await createAdminUser('pro')
      const boat = await BoatFactory.merge({ organizationId: owner.organizationId! }).create()
      const attacker = await createAdminUser('pro')

      const response = await client
        .get(`/boats/${boat.id}/export/${exportCase.path}`)
        .loginAs(attacker)
        .redirects(0)

      response.assertStatus(302)
      response.assertHeader('location', '/boats')
    })

    test(`GET export/${exportCase.path} exige une session`, async ({ client }) => {
      const user = await createAdminUser('pro')
      const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

      const response = await client.get(`/boats/${boat.id}/export/${exportCase.path}`).redirects(0)

      response.assertStatus(302)
      response.assertHeader('location', '/login')
    })
  }

  test("la garde de plan passe avant la résolution du bateau — l'ordre est un contrat", async ({
    client,
  }) => {
    const user = await createStarterAdminUser()

    // Bateau inexistant **et** plan sans export : c'est le quota qui répond,
    // pas la redirection `/boats`. Inverser les deux appels dans le contrôleur
    // changerait ce que voit l'utilisateur sans casser aucun autre test.
    const response = await client
      .get('/boats/999999/export/maintenance.csv')
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('errorAction', '/settings/billing')
  })
})

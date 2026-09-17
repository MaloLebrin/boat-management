import { ref, type Ref } from 'vue'

/**
 * Ce qu'un `useForm()` d'Inertia expose au cycle d'édition inline : ses champs
 * — tous en `string`, un formulaire HTML natif —, sa remise à zéro et son
 * `patch`.
 */
export type InlineEditForm<F extends Record<string, string>> = F & {
  reset: () => void
  patch: (url: string, options: { preserveScroll: boolean; onSuccess: () => void }) => void
}

export interface UseInlineRowEditOptions<
  T extends { id: number },
  F extends Record<string, string>,
> {
  /** Le `useForm()` du composant, partagé par les lignes éditées à tour de rôle. */
  form: InlineEditForm<F>
  /** Valeurs à charger dans le formulaire pour cette ligne. */
  fill: (row: T) => F
  /** URL de mise à jour d'une ligne. */
  url: (id: number) => string
}

export interface InlineRowEdit<T extends { id: number }> {
  /** Ligne en cours d'édition — `null` quand aucune ne l'est. */
  editingId: Ref<number | null>
  /** À brancher sur le `v-if` de la ligne éditée. */
  isEditing: (id: number) => boolean
  /** Ouvre l'édition de cette ligne et charge le formulaire. */
  start: (row: T) => void
  /** Referme sans envoyer, et remet le formulaire à zéro. */
  cancel: () => void
  /** Envoie la ligne ; elle ne se referme **qu'au succès**. */
  submit: (id: number) => void
}

/**
 * Cycle d'édition inline d'une ligne de liste (vague 3.5) : les deux listes de
 * budget — écritures et séjours au port — en tenaient chacune leur copie.
 *
 * Le formulaire reste celui du composant : lui seul connaît ses champs et la
 * façon de les remplir depuis une ligne (`fill`), y compris les `null` du
 * serveur qui deviennent chaîne vide. Ce qui est partagé, c'est le va-et-vient
 * autour : quelle ligne est ouverte, la remise à zéro à l'annulation, et la
 * fermeture au seul succès de l'envoi — pas avant, sinon une erreur de
 * validation referme la ligne et perd la saisie.
 */
export function useInlineRowEdit<T extends { id: number }, F extends Record<string, string>>(
  options: UseInlineRowEditOptions<T, F>
): InlineRowEdit<T> {
  const editingId = ref<number | null>(null)

  function isEditing(id: number): boolean {
    return editingId.value === id
  }

  function start(row: T) {
    editingId.value = row.id
    Object.assign(options.form, options.fill(row))
  }

  function cancel() {
    editingId.value = null
    options.form.reset()
  }

  function submit(id: number) {
    options.form.patch(options.url(id), {
      preserveScroll: true,
      onSuccess: () => {
        editingId.value = null
        options.form.reset()
      },
    })
  }

  return { editingId, isEditing, start, cancel, submit }
}

export const NOVELTY_PENDING_REVIEW_STATE = '0';

/**
 * Indica si la novedad del docente está en revisión
 * (NOCD_ESTADONOVEDAD = 0).
 */
export function isProfessorNoveltyPendingReview(
  estadoNovedad: string | number | null | undefined,
): boolean {
  if (estadoNovedad == null || estadoNovedad === '') {
    return false;
  }
  return String(estadoNovedad) === NOVELTY_PENDING_REVIEW_STATE;
}

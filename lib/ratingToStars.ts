/**
 * Convert rating to 1-5 star rating
 * @param rating: Normalized rating [0..1] (common.rating[n].rating)
 * @returns Number of stars: 1, 2, 3, 4 or 5 stars
 */

export function ratingToStars(rating: number): number {
  return rating === undefined ? 0 : 1 + Math.round(rating * 4);
}

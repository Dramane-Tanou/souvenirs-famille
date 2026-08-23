"use client";

import { useEffect, useRef } from "react";

/**
 * Ré-exécute `fetchFn` toutes les `intervalMs` millisecondes tant que le
 * composant reste monté (et `enabled` vrai), pour que les pages reflètent ce
 * que d'autres personnes ont changé sans recharger la page. `fetchFn` doit
 * lui-même mettre à jour son état (ex: appeler l'API puis setX(résultat)) —
 * ce hook orchestre juste l'appel initial + les rappels réguliers, sans
 * jamais relancer l'intervalle à chaque rendu (fetchFn est lu via une ref).
 */
export function usePolling(fetchFn: () => unknown, intervalMs: number, enabled = true) {
  const fetchRef = useRef(fetchFn);
  useEffect(() => {
    fetchRef.current = fetchFn;
  }, [fetchFn]);

  useEffect(() => {
    if (!enabled) return;
    fetchRef.current();
    const interval = setInterval(() => {
      fetchRef.current();
    }, intervalMs);
    return () => clearInterval(interval);
  }, [intervalMs, enabled]);
}

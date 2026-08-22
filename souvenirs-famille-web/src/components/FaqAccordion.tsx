"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface FaqItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    question: "Qui peut créer un cercle familial ?",
    answer: "N'importe quel utilisateur inscrit peut créer un cercle familial depuis le tableau de bord. La personne qui crée la famille en devient automatiquement l'administrateur (le \"créateur\").",
  },
  {
    question: "Quelle différence entre créateur et membre ?",
    answer: "Le créateur (rôle \"admin\") peut gérer l'abonnement de la famille. Les membres (rôle \"contributeur\") peuvent ajouter des photos, consulter le fil de souvenirs et les livres, mais ne gèrent pas l'abonnement.",
  },
  {
    question: "Comment rejoindre une famille existante ?",
    answer: "Le créateur de la famille peut partager son code d'invitation (visible en haut du fil de souvenirs). Toute personne inscrite peut ensuite l'utiliser depuis \"Créer ou rejoindre une famille\" pour rejoindre le cercle.",
  },
  {
    question: "Qui peut gérer l'abonnement ?",
    answer: "Seul le créateur de la famille (rôle admin) peut passer au plan payant ou revenir au plan gratuit, depuis l'onglet Abonnement.",
  },
  {
    question: "Quelle est la limite du plan gratuit ?",
    answer: "Le plan gratuit est limité à un nombre défini de photos par famille. Une fois la limite atteinte, il faut passer au plan Famille pour continuer à ajouter des souvenirs.",
  },
  {
    question: "Comment fonctionne \"Ce jour-là\" ?",
    answer: "Cette section affiche automatiquement les photos ajoutées à la même date (jour et mois) lors des années précédentes, pour se rappeler des souvenirs passés.",
  },
  {
    question: "Quels formats de photo sont acceptés ?",
    answer: "Tous les formats courants sont acceptés (JPEG, PNG, WebP, GIF, BMP), y compris le HEIC/HEIF utilisé par défaut sur iPhone. La conversion se fait automatiquement lors de l'envoi.",
  },
  {
    question: "Comment générer un livre photo ?",
    answer: "Depuis l'onglet Livres, choisissez une période (1 mois, 3 mois, 6 mois ou 1 an) puis cliquez sur \"Générer le livre\". L'application compose automatiquement les pages à partir des photos de la période choisie.",
  },
  {
    question: "Puis-je supprimer un livre généré ?",
    answer: "Oui, tant qu'il n'a pas encore été commandé (statut \"Brouillon\" ou \"Validé\"). Une fois la commande passée, le livre ne peut plus être supprimé.",
  },
  {
    question: "Puis-je modifier ou supprimer une photo déjà publiée ?",
    answer: "Oui. Survolez une photo dans le fil de souvenirs pour faire apparaître le menu, qui permet de modifier la légende ou de supprimer le souvenir.",
  },
  {
    question: "Qui peut voir les photos de ma famille ?",
    answer: "Uniquement les membres du cercle familial (créateur et contributeurs). Les photos ne sont jamais publiques ni partagées avec d'autres familles.",
  },
  {
    question: "Comment fonctionne le paiement des livres ?",
    answer: "Le paiement se fait en ligne au moment de la commande, une fois le livre validé. Toutes les transactions sont sécurisées.",
  },
];

export function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
      {FAQ_ITEMS.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <div key={index} className={index > 0 ? "border-t border-gray-100" : ""}>
            <button
              onClick={() => setOpenIndex(isOpen ? null : index)}
              className="w-full flex items-center justify-between text-left px-5 py-4"
            >
              <span className="text-base font-medium text-gray-800 pr-4">{item.question}</span>
              <ChevronDown
                size={18}
                className={`flex-shrink-0 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
              />
            </button>
            {isOpen && (
              <p className="text-base text-gray-600 px-5 pb-4 -mt-1">{item.answer}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
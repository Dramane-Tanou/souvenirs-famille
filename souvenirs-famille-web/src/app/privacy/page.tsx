"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { fadeInUp, staggerContainer } from "@/lib/motion";
import { BackHeader } from "@/components/BackHeader";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.section variants={fadeInUp} className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-black/5">
      <h2 className="text-lg font-semibold text-brand-dark mb-3">{title}</h2>
      <div className="space-y-3 text-base text-gray-700 leading-relaxed">{children}</div>
    </motion.section>
  );
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-brand-light pb-16">
      <BackHeader
        title="Politique de Confidentialité"
        subtitle="Dernière mise à jour : 24 août 2026"
        backHref="/"
        backLabel="Accueil"
      />

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="max-w-2xl mx-auto px-4 sm:px-8 mt-6 space-y-4"
      >
        <Section title="1. Qui nous sommes">
          <p>
            Cette politique explique comment <strong>[Nom de l&apos;entité légale — à compléter]</strong> («
            nous », « notre »), responsable du traitement des données pour l&apos;application Souvenirs Famille
            (« le Service »), collecte, utilise et protège vos données personnelles.
          </p>
          <p>
            Nous nous adressons à des utilisateurs de nombreux pays. Cette politique décrit un socle de droits et
            de garanties applicable à l&apos;ensemble de nos utilisateurs, quel que soit leur pays de résidence,
            inspiré des standards les plus protecteurs (notamment le Règlement européen sur la protection des
            données, RGPD). Lorsque le droit de votre pays vous accorde des droits supplémentaires, ceux-ci
            s&apos;appliquent également.
          </p>
        </Section>

        <Section title="2. Données que nous collectons">
          <p>
            <strong>Données de compte :</strong> nom, prénom, adresse e-mail ou numéro de téléphone, mot de passe
            (stocké de façon chiffrée, jamais en clair), date de naissance, genre, photo de profil facultative.
            Si vous vous connectez via Google, Facebook ou Apple, nous recevons les informations de base de profil
            partagées par ce prestataire (nom, e-mail, identifiant).
          </p>
          <p>
            <strong>Contenu que vous publiez :</strong> les photos que vous ajoutez au fil de souvenirs, leurs
            légendes, la date que vous leur attribuez, ainsi que les réglages de cadrage que vous choisissez.
          </p>
          <p>
            <strong>Données techniques :</strong> votre adresse IP (utilisée notamment pour détecter
            automatiquement votre devise d&apos;affichage), des informations sur votre appareil et votre
            navigateur, ainsi que des données stockées localement dans votre navigateur (voir la section « Cookies
            et stockage local » ci-dessous).
          </p>
          <p>
            <strong>Données de paiement :</strong> lorsque vous souscrivez un abonnement ou commandez un livre
            photo, le paiement est traité par un prestataire tiers (Stripe, PayPal ou CinetPay). Nous recevons la
            confirmation du paiement et un identifiant de transaction, jamais le numéro complet de votre carte
            bancaire.
          </p>
        </Section>

        <Section title="3. Pourquoi nous utilisons ces données">
          <ul className="list-disc pl-5 space-y-1">
            <li>Fournir, maintenir et améliorer le Service (afficher votre fil de souvenirs, générer vos livres photo) ;</li>
            <li>Gérer votre compte et l&apos;accès aux cercles familiaux dont vous êtes membre ;</li>
            <li>Traiter vos commandes et abonnements, et vous en communiquer le suivi ;</li>
            <li>Vous envoyer des communications liées au Service (confirmation, sécurité du compte, réponse à une demande de support) ;</li>
            <li>Assurer la sécurité du Service et prévenir les usages frauduleux ;</li>
            <li>Respecter nos obligations légales, notamment comptables et fiscales.</li>
          </ul>
          <p>
            Nous n&apos;utilisons pas vos données à des fins de publicité ciblée et nous ne vendons pas vos
            données personnelles à des tiers.
          </p>
        </Section>

        <Section title="4. Avec qui nous partageons vos données">
          <p>Nous partageons certaines données, dans la stricte mesure nécessaire, avec :</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>nos prestataires d&apos;hébergement et d&apos;infrastructure technique, qui stockent le Service et vos données ;</li>
            <li>nos prestataires de paiement (Stripe, PayPal, CinetPay) lors d&apos;un abonnement ou d&apos;une commande ;</li>
            <li>les autres membres du ou des cercles familiaux auxquels vous appartenez, dans la mesure inhérente au fonctionnement du Service (ils voient les photos et informations que vous partagez avec ce cercle) ;</li>
            <li>les autorités compétentes, uniquement lorsque la loi nous y oblige.</li>
          </ul>
        </Section>

        <Section title="5. Transferts internationaux">
          <p>
            Selon votre pays de résidence, l&apos;hébergement du Service peut impliquer un transfert de vos
            données vers un pays différent du vôtre. Lorsque c&apos;est le cas, nous veillons à ce que nos
            prestataires offrent un niveau de protection adapté (notamment via des clauses contractuelles types
            reconnues internationalement ou une certification équivalente), quelle que soit votre localisation.
          </p>
        </Section>

        <Section title="6. Durée de conservation">
          <p>
            Nous conservons vos données de compte et votre Contenu tant que votre compte reste actif. Après
            suppression d&apos;un compte, vos données personnelles et le contenu qui vous appartient en propre
            sont supprimés dans un délai raisonnable, sous réserve des données que nous devons conserver plus
            longtemps pour respecter une obligation légale (par exemple des données de facturation à des fins
            comptables).
          </p>
        </Section>

        <Section title="7. Sécurité">
          <p>
            Nous mettons en œuvre des mesures techniques et organisationnelles raisonnables pour protéger vos
            données contre l&apos;accès non autorisé, la perte ou l&apos;altération, notamment le chiffrement des
            mots de passe et des communications entre votre appareil et nos serveurs. Aucun système
            n&apos;étant infaillible, nous vous encourageons à utiliser un mot de passe unique et robuste.
          </p>
        </Section>

        <Section title="8. Vos droits">
          <p>Vous disposez, sur vos données personnelles, des droits suivants — que nous accordons à tous nos utilisateurs, quel que soit leur pays :</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Accès :</strong> obtenir une copie des données que nous détenons sur vous ;</li>
            <li><strong>Rectification :</strong> corriger une information inexacte ou incomplète ;</li>
            <li><strong>Effacement :</strong> demander la suppression de votre compte et de vos données ;</li>
            <li><strong>Portabilité :</strong> recevoir vos données dans un format réutilisable ;</li>
            <li><strong>Opposition et limitation :</strong> vous opposer à un traitement ou en demander la limitation, dans les cas prévus par la loi applicable.</li>
          </ul>
          <p>
            Vous pouvez exercer la plupart de ces droits directement depuis votre profil dans l&apos;application.
            Pour toute autre demande, contactez-nous via la page{" "}
            <Link href="/contact" className="text-brand font-medium hover:underline">
              Contact
            </Link>
            . Si vous résidez dans un pays disposant d&apos;une autorité de protection des données (par exemple la
            CNIL en France, le PFPDT en Suisse, ou une autorité équivalente dans votre pays), vous conservez le
            droit de lui adresser une réclamation.
          </p>
        </Section>

        <Section title="9. Photos incluant des mineurs">
          <p>
            Le Service s&apos;adresse à des titulaires de compte majeurs ou proches de la majorité (voir nos{" "}
            <Link href="/terms" className="text-brand font-medium hover:underline">
              Conditions Générales d&apos;Utilisation
            </Link>
            ). Il est cependant courant qu&apos;une photo de famille comprenne des enfants qui ne sont pas
            eux-mêmes titulaires d&apos;un compte. Dans ce cas, la personne qui publie la photo est responsable de
            s&apos;assurer qu&apos;elle dispose du consentement nécessaire, notamment de la part des représentants
            légaux du mineur concerné, pour partager cette image au sein du cercle familial. Un représentant légal
            souhaitant qu&apos;une photo de l&apos;enfant dont il a la charge soit retirée peut nous contacter via
            la page{" "}
            <Link href="/contact" className="text-brand font-medium hover:underline">
              Contact
            </Link>
            .
          </p>
        </Section>

        <Section title="10. Cookies et stockage local">
          <p>
            Le Service utilise le stockage local de votre navigateur (localStorage/sessionStorage) pour des
            besoins strictement fonctionnels : conserver votre session de connexion, mémoriser si vous avez déjà
            vu certaines notifications, ou fluidifier votre navigation. Ces données restent sur votre appareil et
            ne sont pas transmises à des tiers à des fins publicitaires. Le Service n&apos;utilise pas de cookies
            de suivi publicitaire.
          </p>
        </Section>

        <Section title="11. Modification de cette politique">
          <p>
            Nous pouvons modifier cette politique pour refléter une évolution du Service ou du cadre légal
            applicable. Toute modification substantielle vous sera signalée par un moyen raisonnable avant son
            entrée en vigueur.
          </p>
        </Section>

        <Section title="12. Nous contacter">
          <p>
            Pour toute question relative à cette politique ou pour exercer vos droits, contactez-nous depuis la
            page{" "}
            <Link href="/contact" className="text-brand font-medium hover:underline">
              Contact
            </Link>{" "}
            de l&apos;application, ou par e-mail à <strong>[adresse e-mail de contact — à compléter]</strong>.
          </p>
        </Section>
      </motion.div>
    </main>
  );
}

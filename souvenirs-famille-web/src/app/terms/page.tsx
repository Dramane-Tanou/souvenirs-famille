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

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-brand-light pb-16">
      <BackHeader
        title="Conditions Générales d'Utilisation"
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
        <Section title="1. Objet">
          <p>
            Les présentes Conditions Générales d&apos;Utilisation (« CGU ») régissent l&apos;accès et
            l&apos;utilisation de l&apos;application Souvenirs Famille (« le Service »), qui permet à des membres
            d&apos;un même cercle familial de partager des photos, de composer un fil de souvenirs chronologique et
            de créer des albums photo imprimés ou numériques.
          </p>
          <p>
            Le Service est édité par <strong>[Nom de l&apos;entité légale — à compléter]</strong>, immatriculée à{" "}
            <strong>[adresse du siège — à compléter]</strong> (« nous », « notre »). Ces informations
            d&apos;identification doivent être renseignées avant toute ouverture publique du Service, conformément
            aux obligations de transparence applicables dans la plupart des pays.
          </p>
          <p>
            Le Service s&apos;adresse à des utilisateurs du monde entier. Les présentes CGU sont rédigées de manière
            générale, sans viser un pays en particulier ; lorsque le droit de votre pays de résidence vous accorde
            des protections plus favorables que celles décrites ici, ces protections locales prévalent.
          </p>
        </Section>

        <Section title="2. Acceptation">
          <p>
            En créant un compte ou en utilisant le Service de toute autre manière, vous reconnaissez avoir lu,
            compris et accepté les présentes CGU ainsi que notre{" "}
            <Link href="/privacy" className="text-brand font-medium hover:underline">
              Politique de Confidentialité
            </Link>
            . Si vous n&apos;acceptez pas ces conditions, vous ne devez pas utiliser le Service.
          </p>
        </Section>

        <Section title="3. Éligibilité">
          <p>
            Vous devez avoir au moins 13 ans pour créer un compte et devenir titulaire d&apos;un profil sur le
            Service. Si le droit de votre pays de résidence fixe un âge minimum ou une exigence de consentement
            parental différente pour ce type de service, cette règle locale s&apos;applique et il vous appartient
            de la respecter ; en créant un compte, vous garantissez que vous remplissez les conditions d&apos;âge
            applicables dans votre pays.
          </p>
          <p>
            De jeunes membres d&apos;une famille peuvent également apparaître sur des photos partagées par un
            adulte titulaire d&apos;un compte, sans être eux-mêmes titulaires d&apos;un profil.
          </p>
          <p>
            En créant un compte, vous garantissez que les informations fournies (nom, date de naissance, adresse
            e-mail ou numéro de téléphone) sont exactes et vous vous engagez à les maintenir à jour.
          </p>
        </Section>

        <Section title="4. Votre compte">
          <p>
            Vous êtes responsable de la confidentialité de vos identifiants de connexion et de toute activité
            réalisée depuis votre compte. Prévenez-nous sans délai si vous suspectez un accès non autorisé.
          </p>
          <p>
            Un cercle familial regroupe plusieurs comptes autour d&apos;un espace partagé. Le créateur d&apos;un
            cercle familial en est administrateur par défaut et peut inviter d&apos;autres membres ; certaines
            actions (retrait d&apos;un membre, suppression du cercle) peuvent être réservées aux administrateurs du
            cercle concerné.
          </p>
        </Section>

        <Section title="5. Contenu que vous partagez">
          <p>
            Vous conservez l&apos;intégralité de vos droits de propriété intellectuelle sur les photos, légendes et
            autres contenus que vous publiez sur le Service (« votre Contenu »).
          </p>
          <p>
            En publiant du Contenu, vous nous accordez une licence non exclusive, gratuite et limitée au monde
            entier, nécessaire pour héberger, reproduire, adapter (par exemple recadrer une photo pour un format
            d&apos;album) et afficher ce Contenu, exclusivement dans le but de faire fonctionner le Service pour vous et
            les membres du cercle familial avec lequel vous le partagez. Cette licence prend fin lorsque vous
            supprimez le Contenu concerné ou votre compte, sous réserve des copies de sauvegarde techniques
            normales et des exemplaires imprimés déjà commandés.
          </p>
          <p>
            Vous êtes seul responsable du Contenu que vous publiez. En particulier, si vous publiez une photo sur
            laquelle apparaît une autre personne (y compris un mineur), vous garantissez disposer de
            l&apos;autorisation nécessaire de cette personne ou, pour un mineur, de son ou ses représentants légaux,
            pour partager cette image dans le cadre du cercle familial concerné.
          </p>
          <p>
            Vous vous engagez à ne pas publier de contenu illicite, portant atteinte aux droits d&apos;un tiers,
            diffamatoire, ou contraire à l&apos;ordre public. Nous nous réservons le droit de retirer tout contenu
            signalé comme contraire aux présentes CGU et de suspendre le compte à l&apos;origine d&apos;un abus
            manifeste et répété.
          </p>
        </Section>

        <Section title="6. Abonnements, commandes et paiements">
          <p>
            Le Service propose un plan gratuit avec des limites d&apos;usage, ainsi qu&apos;un abonnement payant
            donnant accès à des fonctionnalités supplémentaires. Vous pouvez également commander un album photo
            imprimé ou une version PDF, moyennant un tarif indiqué avant confirmation de la commande.
          </p>
          <p>
            Les paiements sont traités par des prestataires tiers spécialisés (notamment Stripe, PayPal ou
            CinetPay selon le moyen de paiement choisi et votre zone géographique). Nous ne stockons jamais les
            données complètes de votre carte bancaire ; ces informations sont traitées directement par le
            prestataire de paiement, selon ses propres conditions et politiques de confidentialité.
          </p>
          <p>
            Les conditions de remboursement d&apos;une commande d&apos;album imprimé dépendent du stade de fabrication
            atteint au moment de la demande ; contactez-nous dès que possible en cas de problème avec une commande.
          </p>
        </Section>

        <Section title="7. Disponibilité du Service et sauvegardes">
          <p>
            Nous mettons en œuvre des moyens raisonnables pour assurer la disponibilité et la fiabilité du
            Service, sans pouvoir garantir un fonctionnement ininterrompu ou exempt d&apos;erreurs. Le Service
            n&apos;est pas un service de sauvegarde à vocation d&apos;archivage exclusif : nous vous recommandons de
            conserver une copie personnelle des photos qui ont pour vous une valeur particulière, notamment sous
            forme d&apos;album imprimé.
          </p>
        </Section>

        <Section title="8. Résiliation">
          <p>
            Vous pouvez cesser d&apos;utiliser le Service et demander la suppression de votre compte à tout moment
            depuis votre profil ou en nous contactant. La suppression d&apos;un compte entraîne la suppression des
            données associées, dans les conditions décrites par notre{" "}
            <Link href="/privacy" className="text-brand font-medium hover:underline">
              Politique de Confidentialité
            </Link>
            .
          </p>
          <p>
            Nous pouvons suspendre ou résilier l&apos;accès d&apos;un compte en cas de violation grave ou répétée
            des présentes CGU, après information préalable lorsque les circonstances le permettent.
          </p>
        </Section>

        <Section title="9. Propriété intellectuelle du Service">
          <p>
            Le nom, le logo, le design, le code source et les autres éléments propres au Service (à
            l&apos;exclusion de votre Contenu) restent notre propriété exclusive ou celle de nos concédants. Aucune
            disposition des présentes CGU ne vous transfère un quelconque droit sur ces éléments.
          </p>
        </Section>

        <Section title="10. Limitation de responsabilité">
          <p>
            Dans la mesure permise par le droit applicable, le Service est fourni « en l&apos;état », sans garantie
            d&apos;aucune sorte. Nous ne pourrons être tenus responsables des dommages indirects résultant de
            l&apos;utilisation ou de l&apos;impossibilité d&apos;utiliser le Service. Rien dans les présentes CGU
            n&apos;a pour effet d&apos;exclure une responsabilité qui ne peut être limitée en vertu du droit
            impératif applicable dans votre pays de résidence (notamment en cas de faute grave ou intentionnelle).
          </p>
        </Section>

        <Section title="11. Modification des CGU">
          <p>
            Nous pouvons modifier les présentes CGU pour refléter une évolution du Service ou du cadre légal
            applicable. Toute modification substantielle vous sera signalée par un moyen raisonnable (notification
            dans l&apos;application ou par e-mail) avant son entrée en vigueur. La poursuite de l&apos;utilisation
            du Service après cette entrée en vigueur vaut acceptation des CGU modifiées.
          </p>
        </Section>

        <Section title="12. Droit applicable">
          <p>
            Sauf disposition impérative contraire du droit de votre pays de résidence qui vous accorderait une
            protection plus favorable, les présentes CGU sont régies par le droit de{" "}
            <strong>[pays/juridiction — à compléter]</strong>. Cette clause ne vous prive d&apos;aucune protection
            que vous garantit le droit impératif de votre pays de résidence en tant que consommateur.
          </p>
        </Section>

        <Section title="13. Contact">
          <p>
            Pour toute question relative aux présentes CGU, vous pouvez nous contacter depuis la page{" "}
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

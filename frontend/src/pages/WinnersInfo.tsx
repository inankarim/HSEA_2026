import { motion } from "framer-motion";
import Footer from "../components/Footer";
import {
  ChapterIntro,
  ChapterGroup,
  RuleItem,
  PendingNote,
  Highlight,
  GhostWord,
} from "../components/Editorial";
import winner from "../assets/winners.png"
import Header from "../components/Header";
const WinnersInfo = () => {
  return (
    <div className="bg-white text-white">
      <Header/>
        <section className="relative w-full overflow-hidden bg-[#171A1C]">
        <div className="absolute inset-0 overflow-hidden">
          <motion.img
            src={winner}
            alt="Award Categories Hero"
            className="absolute inset-0 w-full h-full object-contain object-center"
          />
        </div>

        <div className="w-full aspect-[4/1]" />
      </section>
      <div className="relative">

        <ChapterIntro
          number="02"
          label="Beyond The Trophy"
          statement="Recognition becomes part of a project's lasting legacy."
          paragraph="Winning projects and recipients receive formal recognition, visibility, exhibition opportunities, and participation in the HSEA legacy."
        />
      </div>

      {/* WINNER BENEFITS */}
      <ChapterGroup number="01" total="01" label="Winner Benefits" tinted>
        <RuleItem
          index={0}
          number="01"
          category="Awards Ceremony"
          title="Awards Gala & Venue"
        >
          <p>
            The official presentation of the Holcim Structural Excellence
            Awards will take place at a prestigious venue in Dhaka, which
            will be formally announced to all participants and shortlisted
            teams in advance of the event.
          </p>
        </RuleItem>

        <RuleItem
          index={1}
          number="02"
          category="Recognition"
          title="Recipient Designation"
        >
          <PendingNote />
        </RuleItem>

        <RuleItem
          index={2}
          number="03"
          category="Eligibility"
          title="Public Sector & Government Submissions"
        >
          <PendingNote />
        </RuleItem>

        <RuleItem
          index={3}
          number="04"
          category="Recognition"
          title="Project Team Recognition"
        >
          <PendingNote />
        </RuleItem>

        <RuleItem
          index={4}
          number="05"
          category="Ceremony"
          title="In-Person Award Acceptance"
        >
          <PendingNote />
        </RuleItem>

        <RuleItem
          index={5}
          number="06"
          category="Media"
          title="Exhibition & Promotional Rights"
        >
          <PendingNote />
        </RuleItem>

        {/* PRIZE SECTION — stronger visual treatment per the brief */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="grid grid-cols-1 md:grid-cols-[80px_1fr] gap-4 md:gap-10">
            <span className="text-3xl font-light text-navy-deep tabular-nums">
              07
            </span>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-[2px] text-[#66727A]">
                Financial Disbursement
              </span>
              <h4 className="mt-2 text-lg md:text-xl font-bold uppercase tracking-wide text-[#171A1C]">
                Prize Disbursement
              </h4>

              <div className="mt-5 border border-[#171A1C]/10 p-6 md:p-8">
                <p className="text-sm font-bold uppercase tracking-[2px] text-navy-deep">
                  Account Payee Cheque
                </p>
                <p className="mt-3 max-w-2xl text-[#66727A] leading-relaxed">
                  Any financial grants or prize purses accompanying an
                  award will be issued via Account Payee Cheque payable
                  strictly to the primary recipient or entity named on the
                  official submission form during the award ceremony.
                </p>
              </div>
            </div>
          </div>
          <div className="mt-10 h-px w-full bg-[#171A1C]/10" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="grid grid-cols-1 md:grid-cols-[80px_1fr] gap-4 md:gap-10">
            <span className="text-3xl font-light text-navy-deep tabular-nums">
              08
            </span>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-[2px] text-[#66727A]">
                Financial Disbursement
              </span>
              <h4 className="mt-2 text-lg md:text-xl font-bold uppercase tracking-wide text-[#171A1C]">
                Unclaimed & Uncashed Grants
              </h4>

              <div className="mt-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8 border border-[#171A1C]/10 p-6 md:p-8">
                <span className="text-4xl md:text-5xl font-bold text-navy-deep tabular-nums shrink-0">
                  6 Months
                </span>
                <p className="max-w-xl text-[#66727A] leading-relaxed">
                  Recipients receiving financial disbursements must deposit
                  and encash their award cheques within{" "}
                  <Highlight>six (6) months</Highlight> of the issue date.
                </p>
              </div>
            </div>
          </div>
          <div className="mt-10 h-px w-full bg-[#171A1C]/10" />
        </motion.div>
      </ChapterGroup>

      {/* CLOSING STATEMENT */}
      <section className="relative overflow-hidden">
        <GhostWord>HOLCIM</GhostWord>
        <div className="relative mx-auto max-w-4xl px-6 py-24 md:py-32 text-center">
          <span className="text-xs font-bold uppercase tracking-[3px] text-navy-deep">
            The Recognition Continues
          </span>
          <p className="mt-6 text-2xl md:text-4xl font-bold leading-snug text-[#171A1C]">
            From the award ceremony to exhibitions, publications, archives,
            and professional recognition, HSEA celebrates the people and
            projects shaping the future of structural engineering.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default WinnersInfo;
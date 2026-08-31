import Footer from "../components/Footer";
import {
  InfoHero,
  ChapterIntro,
  ChapterGroup,
  RuleItem,
  PendingNote,
} from "../components/Editorial";

const GeneralInfo = () => {
  return (
    <div className="bg-white text-[#071C2C] [text-shadow:0_2px_8px_rgba(0,0,0,0.35)]">
      <InfoHero title="General Information" />

      <ChapterIntro
        number="01"
        label="The Foundation"
        statement="Clear rules create a fair stage for structural excellence."
        paragraph="These guidelines establish the framework for participation, eligibility, submission, evaluation, and governance of the Holcim Structural Excellence Awards 2026."
      />

      {/* CHAPTER 01 — SUBMISSION & ELIGIBILITY */}
      <ChapterGroup number="01" total="03" label="Submission & Eligibility">
        <RuleItem
          index={0}
          number="01"
          category="Submission"
          title="Official Application Portal"
        >
          <p>
            All entries must be registered and submitted digitally through
            the official HSEA online portal.
          </p>
          <p>Physical or email submissions will not be accepted.</p>
        </RuleItem>

        <RuleItem
          index={1}
          number="02"
          category="Timeline"
          title="Application Window"
        >
          <p>
            Submissions for the HSEA 2026 cycle open on{" "}
            <span className="inline-block border-b border-[#C86F3D]/60 px-1 text-[#171A1C] font-medium">
              ________
            </span>{" "}
            and close on{" "}
            <span className="inline-block border-b border-[#C86F3D]/60 px-1 text-[#171A1C] font-medium">
              ________
            </span>
            .
          </p>
          <p>
            Official extensions or timeline modifications will be published
            exclusively by the Award Secretariat.
          </p>
        </RuleItem>

        <RuleItem
          index={2}
          number="03"
          category="Eligibility"
          title="Project Eligibility"
        >
          <p>
            Submitted projects must be located in Bangladesh and have
            achieved substantial structural completion or final handover
            within the last five (5) years prior to the submission
            deadline.
          </p>
          <p className="text-sm">
            <span className="font-bold uppercase tracking-wide text-[#171A1C]">
              Excluded:
            </span>{" "}
            Legendary Structural Engineer Award.
          </p>
        </RuleItem>

        <RuleItem
          index={3}
          number="04"
          category="Participation"
          title="Complimentary Participation"
        >
          <PendingNote />
        </RuleItem>

        <RuleItem
          index={4}
          number="05"
          category="Participation"
          title="Multiple Project Submissions"
        >
          <PendingNote />
        </RuleItem>
      </ChapterGroup>

      {/* CHAPTER 02 — COMPLIANCE & REVIEW */}
      <ChapterGroup number="02" total="03" label="Compliance & Review" tinted>
        <RuleItem
          index={0}
          number="01"
          category="Compliance"
          title="Submission Compliance & Review"
        >
          <PendingNote />
        </RuleItem>

        <RuleItem
          index={1}
          number="02"
          category="Compliance"
          title="Regulatory & Code Compliance"
        >
          <PendingNote />
        </RuleItem>

        <RuleItem
          index={2}
          number="03"
          category="Allocation"
          title="Award Allocation & Exclusivity"
        >
          <PendingNote />
        </RuleItem>

        <RuleItem
          index={3}
          number="04"
          category="Rights"
          title="Intellectual Property & Media Rights"
        >
          <PendingNote />
        </RuleItem>

        <RuleItem
          index={4}
          number="05"
          category="Confidentiality"
          title="Confidentiality & Proprietary Data"
        >
          <PendingNote />
        </RuleItem>
      </ChapterGroup>

      {/* CHAPTER 03 — GOVERNANCE & JURY */}
      <ChapterGroup number="03" total="03" label="Governance & Jury">
        <RuleItem
          index={0}
          number="01"
          category="Jury"
          title="Jury Authority & Deliberation"
        >
          <PendingNote />
        </RuleItem>

        <RuleItem
          index={1}
          number="02"
          category="Jury"
          title="Shortlist Requirements"
        >
          <PendingNote />
        </RuleItem>

        <RuleItem
          index={2}
          number="03"
          category="Evaluation"
          title="Independent Site Evaluations"
        >
          <PendingNote />
        </RuleItem>

        <RuleItem
          index={3}
          number="04"
          category="Governance"
          title="Representation & Award Revocation"
        >
          <PendingNote />
        </RuleItem>

        <RuleItem
          index={4}
          number="05"
          category="Governance"
          title="Governance & Rule Modifications"
        >
          <PendingNote />
        </RuleItem>

        <RuleItem
          index={5}
          number="06"
          category="Legal"
          title="Legal & Regulatory Non-Endorsement"
        >
          <PendingNote />
        </RuleItem>

        <RuleItem
          index={6}
          number="07"
          category="Timeline"
          title="Deadline Adjustments"
        >
          <PendingNote />
        </RuleItem>

        <RuleItem
          index={7}
          number="08"
          category="Eligibility"
          title="Conflict of Interest & Ineligibility"
        >
          <PendingNote />
        </RuleItem>

        <RuleItem
          index={8}
          number="09"
          category="Recognition"
          title="Posthumous Recognition"
        >
          <PendingNote />
        </RuleItem>

        <RuleItem
          index={9}
          number="10"
          category="Materials"
          title="Handling of Intellectual Materials"
        >
          <PendingNote />
        </RuleItem>
      </ChapterGroup>

      <Footer />
    </div>
  );
};

export default GeneralInfo;
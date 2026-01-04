export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <section className="px-6 py-16">
        <div className="mx-auto max-w-4xl space-y-6">
          <h1 className="text-3xl font-semibold">Privacy Policy</h1>
          <p className="text-sm text-slate-300">
            OmniFAIND processes personal data (including professional profiles, CVs, and outreach
            activity) solely to deliver sourcing, screening, and outreach features. We do not sell
            personal data. You remain the controller of the data you upload or source through the
            product; we act as a processor on your instructions.
          </p>

          <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <h2 className="text-lg font-semibold text-slate-100">What we collect and why</h2>
            <ul className="space-y-2 text-sm text-slate-300">
              <li>Account data: name, email, authentication and session data for login and billing.</li>
              <li>
                Workspace data: candidate profiles, CVs, notes, scoring, and outreach content you
                provide; used only to deliver AI sourcing/screening and outreach.
              </li>
              <li>Telemetry: minimal product analytics and logs for reliability, security, and abuse prevention.</li>
            </ul>
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <h2 className="text-lg font-semibold text-slate-100">Security and retention</h2>
            <ul className="space-y-2 text-sm text-slate-300">
              <li>Data encrypted in transit (TLS) and at rest; access limited by least privilege.</li>
              <li>Sessions and exports require authentication; device access can be managed in your account.</li>
              <li>Data is retained only as long as needed for service delivery or legal obligations; deletion is available on request.</li>
            </ul>
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <h2 className="text-lg font-semibold text-slate-100">Subprocessors and transfers</h2>
            <ul className="space-y-2 text-sm text-slate-300">
              <li>We use vetted hosting, storage, auth, email, and analytics providers under DPAs.</li>
              <li>No data is shared with advertisers; subprocessors are limited to service delivery.</li>
              <li>Cross-border transfers use standard contractual safeguards where applicable.</li>
            </ul>
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <h2 className="text-lg font-semibold text-slate-100">Your rights and contact</h2>
            <ul className="space-y-2 text-sm text-slate-300">
              <li>You are responsible for having a lawful basis to process personal data you upload or source.</li>
              <li>You may request access, correction, export, or deletion of data we process for you.</li>
              <li>Contact: privacy@omnifaind.com for data subject requests or DPA questions.</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}

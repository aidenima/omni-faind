export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <section className="px-6 py-16">
        <div className="mx-auto max-w-4xl space-y-6">
          <h1 className="text-3xl font-semibold">Terms of Service</h1>
          <p className="text-sm text-slate-300">
            By using OmniFAIND, you agree to these Terms. If you are accepting on behalf of an
            organization, you confirm you have authority to bind it. We provide the service to help
            you source, screen, and run outreach. You must use it lawfully and respect the rights of
            the people whose data you process.
          </p>

          <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <h2 className="text-lg font-semibold text-slate-100">Acceptable use</h2>
            <ul className="space-y-2 text-sm text-slate-300">
              <li>You must have a lawful basis to process any personal data you upload or source.</li>
              <li>No harassment, spam, discrimination, or unlawful outreach. Follow anti-spam and employment laws.</li>
              <li>Do not reverse engineer, attack, or overload the service. We may rate-limit or suspend abuse.</li>
            </ul>
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <h2 className="text-lg font-semibold text-slate-100">Accounts, billing, and trials</h2>
            <ul className="space-y-2 text-sm text-slate-300">
              <li>Trials include limited credits; paid plans are billed per the plan you select.</li>
              <li>Non-payment or charge failures may lead to suspension or downgrade.</li>
              <li>You are responsible for keeping your credentials secure and managing device access.</li>
            </ul>
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <h2 className="text-lg font-semibold text-slate-100">Data and IP</h2>
            <ul className="space-y-2 text-sm text-slate-300">
              <li>Your uploaded/sourced data remains yours; we process it only to provide the service.</li>
              <li>We retain service and usage data as needed for security, reliability, and compliance.</li>
              <li>The OmniFAIND platform, models, and content remain our intellectual property.</li>
            </ul>
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <h2 className="text-lg font-semibold text-slate-100">Liability and support</h2>
            <ul className="space-y-2 text-sm text-slate-300">
              <li>The service is provided as-is. We aim for high availability but do not guarantee uptime.</li>
              <li>We are not liable for indirect or consequential damages to the maximum extent permitted by law.</li>
              <li>Contact support@omnifaind.com for support or issues.</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}

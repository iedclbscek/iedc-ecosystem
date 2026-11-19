import './account-pages.css';

export default function AccountPage({ title, description, wide, children }) {
  return (
    <main className="sign-in account-page">
      <section className={`sign-in-card account-card${wide ? ' account-wide' : ''}`} aria-labelledby="account-title">
        <div className="sign-in-brand">
          <img src="/iedc-mark.webp" alt="" width="40" height="37" />
          <span>IEDC · LBSCEK</span>
        </div>
        <header className="account-heading">
          <h1 id="account-title">{title}</h1>
          <p>{description}</p>
        </header>
        {children}
      </section>
    </main>
  );
}

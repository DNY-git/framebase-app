import { useEffect, useRef, useState } from 'react';
import { ROLES, ROLE_ORDER, type LandingRoleKey } from './data';
import { CheckIcon, ChevronIcon } from './icons';

function Avatar({ role }: { role: (typeof ROLES)[LandingRoleKey] }) {
  const [failed, setFailed] = useState(false);
  if (!role.avatar || failed) {
    // Initials fallback — same size/ring styling as the image avatar.
    return (
      <span
        aria-hidden="true"
        className="role-ava w-9 h-9 rounded-full bg-stone-100 text-stone-500 flex items-center justify-center shrink-0 text-[10px] font-mono font-bold tracking-wide ring-1 ring-stone-200"
      >
        {role.initials}
      </span>
    );
  }
  return (
    <img
      alt={role.rowName}
      className="role-ava w-9 h-9 rounded-full object-cover shrink-0 ring-1 ring-stone-200"
      height={36}
      loading="lazy"
      src={role.avatar}
      width={36}
      onError={() => setFailed(true)}
    />
  );
}

/** Role & permissions console (reference: RolePermissionsDiagramSection, id="roles"). */
export function RolesConsole() {
  const [active, setActive] = useState<LandingRoleKey>('owner');
  const panelRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  // Panel swap animation: opacity 0→1, translateY 6px→0, 0.25s (skipped on first paint,
  // mirroring the reference which only animates on tab clicks).
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const card = panelRef.current;
    if (!card) return;
    card.style.opacity = '0';
    card.style.transform = 'translateY(6px)';
    card.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
    let second = 0;
    const first = window.requestAnimationFrame(() => {
      second = window.requestAnimationFrame(() => {
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      });
    });
    return () => {
      window.cancelAnimationFrame(first);
      window.cancelAnimationFrame(second);
    };
  }, [active]);

  const r = ROLES[active];

  return (
    <section data-purpose="role-permissions-section" id="roles" className="py-24 border-stone-200 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs font-mono uppercase tracking-widest text-stone-400">Role-Based Access Control</span>
          <h2 className="serif-display text-4xl sm:text-5xl md:text-6xl text-stone-900 font-normal mt-2">
            Everyone has a role.
            <br />
            Everyone stays aligned.
          </h2>
          <p className="mt-4 text-stone-600 text-base md:text-lg">
            Each user gets appropriate access and responsibilities — from the site crew to the business owner. Select a
            team member to inspect their permissions.
          </p>
        </div>
        {/* Interactive RBAC Console */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-dashboard overflow-hidden">
          <span
            className="hidden text-emerald-600 bg-emerald-500 bg-blue-500 bg-amber-500 bg-indigo-500 bg-stone-400 bg-stone-200 w-4 h-1.5 rounded-sm"
            aria-hidden="true"
          />
          <div className="grid grid-cols-1 lg:grid-cols-12">
            {/* Left: Role Directory Rail */}
            <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-stone-200 flex flex-col">
              {/* Console toolbar */}
              <div className="hidden md:flex px-5 sm:px-6 py-4 items-center justify-end gap-3 border-b border-stone-200 bg-stone-50/60">
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    aria-hidden="true"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-terracotta-500 text-white text-[10px] font-mono uppercase tracking-wider"
                  >
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 5v14" />
                      <path d="M5 12h14" />
                    </svg>{' '}
                    Invite
                  </span>
                </div>
              </div>
              {/* Column headers: MEMBER / ROLE */}
              <div className="px-5 sm:px-6 pt-4 pb-2 flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-stone-400">
                <span>Member</span>
                <span className="pr-1">Role</span>
              </div>
              {/* Team Member Rows (each row is a role tab) */}
              <div className="flex flex-col" role="tablist" aria-label="FrameBase roles" id="role-tabs">
                {ROLE_ORDER.map((key) => {
                  const role = ROLES[key];
                  const isActive = key === active;
                  return (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      id={role.tabId}
                      aria-selected={isActive}
                      aria-controls="role-panel"
                      data-role={key}
                      className={`role-tab${isActive ? ' is-active' : ''} w-full flex items-center gap-3 px-5 sm:px-6 py-4 text-left`}
                      onClick={(e) => {
                        e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
                        setActive(key);
                      }}
                    >
                      <Avatar role={role} />
                      <span className="flex-1 min-w-0">
                        <span className="role-name block text-sm font-bold text-stone-900 truncate transition-colors">
                          {role.rowName}{' '}
                          {role.you && <span className="font-normal text-stone-500">(you)</span>}
                        </span>
                        <span className="role-mail block text-[10px] font-mono text-stone-500 truncate transition-colors">
                          {role.email}
                        </span>
                      </span>
                      {key === 'owner' ? (
                        <span className="role-cta inline-flex items-center shrink-0">
                          <span className="px-2.5 py-1 rounded-md bg-terracotta-500 text-white text-[10px] font-mono font-bold uppercase tracking-wider">
                            Owner
                          </span>
                        </span>
                      ) : (
                        <span className="role-cta inline-flex items-center gap-1.5 shrink-0 max-w-[120px] sm:max-w-[150px] text-[11px] font-medium text-stone-500">
                          <span className="truncate">{role.rowRole}</span>
                          <ChevronIcon />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {/* Desktop Footer Note */}
              <div className="hidden lg:flex items-center gap-2 px-6 py-4 border-t border-stone-200 mt-auto text-[10px] font-mono text-stone-400">
                <svg
                  className="w-3.5 h-3.5 text-emerald-600 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
                Permissions are enforced at the database row — not the UI.
              </div>
            </div>
            {/* Right: Detail Panel */}
            <div className="lg:col-span-7 bg-stone-50/40">
              <div id="role-panel" role="tabpanel" aria-labelledby={r.tabId} aria-live="polite">
                <div className="p-6 md:p-10" ref={panelRef}>
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="min-w-0">
                        <div className={`text-[10px] font-mono uppercase tracking-widest ${r.catText}`}>{r.cat}</div>
                        <h3 className="text-xl md:text-2xl font-bold text-stone-900 tracking-tight">{r.name}</h3>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white border border-stone-200 text-[10px] font-mono text-stone-600 shrink-0">
                        <span className={`w-1.5 h-1.5 rounded-full ${r.dot}`} /> {r.pill}
                      </span>
                    </div>
                    <p className="mt-5 text-sm md:text-[15px] text-stone-600 leading-relaxed max-w-xl">{r.desc}</p>
                    <div className="mt-6">
                      <div className="text-[10px] font-mono uppercase tracking-widest text-stone-400 mb-3">
                        Core Permissions
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {r.perms.map((p) => (
                          <div
                            key={p}
                            className="flex items-start gap-2.5 bg-white border border-stone-200 rounded-lg px-3 py-2.5 shadow-card-subtle"
                          >
                            <CheckIcon />
                            <span className="text-xs font-medium text-stone-800 leading-snug">{p}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="mt-8 pt-5 border-t border-stone-200 flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex items-end gap-1" aria-hidden="true">
                          {Array.from({ length: 5 }, (_, i) => (
                            <span
                              key={i}
                              className={`w-4 h-1.5 rounded-sm ${i < r.level ? r.dot : 'bg-stone-200'}`}
                            />
                          ))}
                        </div>
                        <span className="text-[10px] font-mono text-stone-500">
                          Access breadth: <span className="text-stone-800 font-bold">{r.level}/5</span> modules
                        </span>
                      </div>
                    </div>
                  </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

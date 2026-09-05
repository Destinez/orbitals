import { useEffect, useRef, useState } from "react";
import { apiUrl } from "../../lib/api";

type TaskStatus = "locked" | "ready" | "syncing" | "done";

interface CampaignState {
  registered: boolean;
  username: string;
  walletAddress: string;
  quoteUrl: string;
  campaign: { postUrl: string; accountUrl: string; postLive: boolean };
}

const TASKS = [
  {
    key: "follow",
    label: "Follow Orbitals",
    detail: "Keep the survey channel in range.",
  },
  {
    key: "like",
    label: "Like the post",
    detail: "Mark the transmission received.",
  },
  {
    key: "repost",
    label: "Repost the signal",
    detail: "Relay the transmission.",
  },
  {
    key: "quote",
    label: "Quote the post",
    detail: "Submit your public observation.",
  },
] as const;

/** Seconds on-tab after returning from X before a task marks received. */
const RETURN_VERIFY_SECONDS = 5;

const FALLBACK_CAMPAIGN: CampaignState = {
  registered: false,
  username: "",
  walletAddress: "",
  quoteUrl: "",
  campaign: {
    postUrl: "",
    accountUrl: "https://x.com/orbitals_nft",
    postLive: false,
  },
};

const EMPTY_TASKS: Record<string, TaskStatus> = {
  follow: "ready",
  like: "locked",
  repost: "locked",
  quote: "locked",
};

export default function TaskConsole() {
  const [campaign, setCampaign] = useState<CampaignState>(FALLBACK_CAMPAIGN);
  const [tasks, setTasks] = useState<Record<string, TaskStatus>>(EMPTY_TASKS);
  const [username, setUsername] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [quoteUrl, setQuoteUrl] = useState("");
  const [notice, setNotice] = useState("Reading the survey log...");
  const [busy, setBusy] = useState(false);
  const [verifyingKey, setVerifyingKey] = useState<string | null>(null);
  const pendingTask = useRef<number | null>(null);
  const leftPage = useRef(false);
  const timer = useRef<number | null>(null);
  const startVerifyRef = useRef<(index: number) => void>(() => {});

  const completeTask = (index: number): void => {
    if (timer.current !== null) window.clearInterval(timer.current);
    timer.current = null;
    pendingTask.current = null;
    leftPage.current = false;
    setVerifyingKey(null);
    const task = TASKS[index];
    setTasks((current) => {
      const next: Record<string, TaskStatus> = {
        ...current,
        [task.key]: "done",
      };
      const following = TASKS[index + 1];
      if (following && (following.key === "follow" || campaign.campaign.postLive)) {
        next[following.key] = "ready";
      }
      window.localStorage.setItem(
        "resonance-signal-progress",
        JSON.stringify(next),
      );
      return next;
    });
    setNotice(
      index === TASKS.length - 1
        ? "Signal path complete. File the observer record."
        : "Transmission received. Next coordinate unlocked.",
    );
  };

  useEffect(() => {
    startVerifyRef.current = (index: number): void => {
      if (timer.current !== null || pendingTask.current !== index) return;
      let remaining = RETURN_VERIFY_SECONDS;
      setVerifyingKey(TASKS[index].key);
      setNotice("Return signal detected. Verifying the transmission...");
      timer.current = window.setInterval(() => {
        remaining -= 1;
        if (remaining > 0) return;
        completeTask(index);
      }, 1000);
    };
  });

  useEffect(() => {
    const saved = window.localStorage.getItem("resonance-signal-progress");
    if (saved) {
      try {
        const restored = JSON.parse(saved) as Record<string, TaskStatus>;
        for (const task of TASKS) {
          if (restored[task.key] === "syncing") restored[task.key] = "ready";
        }
        setTasks(restored);
      } catch {
        window.localStorage.removeItem("resonance-signal-progress");
      }
    }

    const applyStation = (data: CampaignState): void => {
      setCampaign(data);
      if (data.registered) {
        const completed = {
          follow: "done",
          like: "done",
          repost: "done",
          quote: "done",
        } as const;
        setTasks(completed);
        window.localStorage.setItem(
          "resonance-signal-progress",
          JSON.stringify(completed),
        );
      } else {
        setTasks((current) => gateTasks(current, data.campaign.postLive));
      }
      setUsername(data.username);
      setWalletAddress(data.walletAddress);
      setQuoteUrl(data.quoteUrl);
      setNotice(stationNotice(data));
    };

    const pullStation = (): void => {
      void request<CampaignState>("/api/me")
        .then(applyStation)
        .catch(() =>
          setNotice(
            "Station link offline. Follow stays open; like and quote wait for the post.",
          ),
        );
    };

    pullStation();
    const poll = window.setInterval(pullStation, 20_000);
    return () => window.clearInterval(poll);
  }, []);

  useEffect(() => {
    const markAway = (): void => {
      if (pendingTask.current !== null) leftPage.current = true;
    };
    const tryStartSync = (): void => {
      const index = pendingTask.current;
      if (index === null || !leftPage.current) return;
      startVerifyRef.current(index);
    };
    const onVisibility = (): void =>
      document.hidden ? markAway() : tryStartSync();
    window.addEventListener("blur", markAway);
    window.addEventListener("focus", tryStartSync);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", markAway);
    window.addEventListener("pageshow", tryStartSync);
    return () => {
      window.removeEventListener("blur", markAway);
      window.removeEventListener("focus", tryStartSync);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", markAway);
      window.removeEventListener("pageshow", tryStartSync);
      if (timer.current !== null) window.clearInterval(timer.current);
    };
  }, []);

  const confirmReturn = (index: number): void => {
    const task = TASKS[index];
    if (!task || tasks[task.key] !== "syncing" || verifyingKey !== null) return;
    pendingTask.current = index;
    leftPage.current = true;
    startVerifyRef.current(index);
  };

  const beginTask = (index: number): void => {
    const task = TASKS[index];
    if (!task || tasks[task.key] !== "ready") return;
    pendingTask.current = index;
    leftPage.current = false;
    setTasks((current) => ({ ...current, [task.key]: "syncing" }));
    setNotice(
      "Complete the action on X, then return here or tap the task to verify.",
    );
    window.setTimeout(() => {
      if (pendingTask.current === index) leftPage.current = true;
    }, 600);
  };

  const submitRecord = async (): Promise<void> => {
    setBusy(true);
    try {
      let current = campaign;
      if (!current.registered) {
        current = await request<CampaignState>("/api/register", {
          method: "POST",
          body: JSON.stringify({ username, walletAddress }),
        });
      }
      const filed = await request<CampaignState>("/api/tasks/quote", {
        method: "POST",
        body: JSON.stringify({ url: quoteUrl }),
      });
      setCampaign(filed);
      setUsername(filed.username);
      setWalletAddress(filed.walletAddress);
      setQuoteUrl(filed.quoteUrl);
      setNotice(
        "Observation filed. Mission control will review the public post.",
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Observer record could not be filed.",
      );
    } finally {
      setBusy(false);
    }
  };

  const socialDone = TASKS.filter((task) => tasks[task.key] === "done").length;
  const formDone = [username, walletAddress, quoteUrl].filter((value) =>
    value.trim(),
  ).length;
  const signalComplete = socialDone === TASKS.length;
  const recordComplete = Boolean(campaign?.quoteUrl);
  const totalProgress = recordComplete
    ? 100
    : Math.round(((socialDone + formDone) / 7) * 100);

  return (
    <section
      id="tasks"
      className="relative z-10 border-t border-white/10 bg-[#060810]/90 px-6 py-24 sm:px-12 lg:px-20 lg:py-32"
    >
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-8 border-b border-white/10 pb-10 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="log text-white/35">ORBITALS // OBSERVER INTAKE</p>
            <h2 className="mt-4 font-[family-name:var(--font-display)] text-4xl uppercase leading-none tracking-[-0.04em] text-white sm:text-6xl">
              Enter the resonance.
            </h2>
            <p className="mt-4 max-w-[52ch] text-sm leading-6 text-white/50">
              3,232 observer passes will be issued, one for each object in the
              archive.
            </p>
          </div>
          <div className="min-w-52">
            <div className="log flex justify-between text-[0.6rem] text-white/35">
              <span>LOG PROGRESS</span>
              <span>{totalProgress}%</span>
            </div>
            <div className="mt-2 h-1 overflow-hidden bg-white/10">
              <div
                className="h-full bg-white transition-[width] duration-700"
                style={{ width: `${totalProgress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid gap-5 py-8 lg:grid-cols-2">
          <section className="border border-white/15 bg-black/35 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="log text-white/65">01 // SIGNAL PATH</div>
              <div className="log text-[0.6rem] text-white/30">
                {socialDone}/4 LOGGED
              </div>
            </div>
            <div className="mt-3 h-px overflow-hidden bg-white/10">
              <div
                className="h-full bg-white/70 transition-[width] duration-500"
                style={{ width: `${socialDone * 25}%` }}
              />
            </div>
            <div className="mt-5 space-y-2">
              {TASKS.map((task, index) => {
                const status = tasks[task.key];
                const destination = xIntent(task.key, campaign.campaign);
                const rowClass =
                  "flex w-full items-center gap-3 border border-white/10 p-3 text-left transition-colors enabled:hover:border-white/35 disabled:cursor-default";
                const rowBody = (
                  <>
                    {verifyingKey === task.key ? (
                      <VerifyingRoller />
                    ) : (
                      <span className="log text-white/25">0{index + 1}</span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-white/80">
                        {task.label}
                      </span>
                      <span className="mt-0.5 block text-[0.65rem] text-white/30">
                        {task.detail}
                      </span>
                    </span>
                    <span
                      className={`log text-[0.55rem] ${status === "ready" ? "text-white/70" : status === "done" ? "text-white/45" : "text-white/20"}`}
                    >
                      {verifyingKey === task.key
                        ? "VERIFYING"
                        : statusLabel(status)}
                    </span>
                  </>
                );

                if (status === "ready") {
                  return (
                    <a
                      key={task.key}
                      href={destination}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => beginTask(index)}
                      className={`${rowClass} hover:border-white/35`}
                    >
                      {rowBody}
                    </a>
                  );
                }

                if (status === "syncing") {
                  return (
                    <button
                      key={task.key}
                      type="button"
                      disabled={verifyingKey === task.key}
                      onClick={() => confirmReturn(index)}
                      className={`${rowClass} cursor-pointer border-white/20 hover:border-white/45 disabled:cursor-default`}
                    >
                      {rowBody}
                    </button>
                  );
                }

                return (
                  <button
                    key={task.key}
                    type="button"
                    disabled
                    className={rowClass}
                  >
                    {rowBody}
                  </button>
                );
              })}
            </div>
          </section>

          <section
            className={`border bg-black/35 p-4 transition-colors sm:p-6 ${signalComplete ? "border-white/20" : "border-white/10"}`}
          >
            <div className="flex items-center justify-between">
              <div className="log text-white/65">02 // OBSERVER RECORD</div>
              <div className="log text-[0.6rem] text-white/30">
                {recordComplete ? "FILED" : `${formDone}/3 FIELDS`}
              </div>
            </div>
            <div className="mt-3 h-px overflow-hidden bg-white/10">
              <div
                className="h-full bg-white/70 transition-[width] duration-500"
                style={{ width: `${recordComplete ? 100 : formDone * 33.33}%` }}
              />
            </div>

            <div
              className={`mt-5 space-y-3 transition-opacity ${signalComplete ? "opacity-100" : "pointer-events-none opacity-25"}`}
            >
              <input
                disabled={campaign?.registered}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="X username"
                className="w-full border border-white/15 bg-white/5 px-3 py-3 text-xs text-white outline-none placeholder:text-white/20 focus:border-white/45 disabled:text-white/40"
              />
              <input
                disabled={campaign?.registered}
                value={walletAddress}
                onChange={(event) => setWalletAddress(event.target.value)}
                placeholder="0x... receiving wallet"
                className="w-full border border-white/15 bg-white/5 px-3 py-3 text-xs text-white outline-none placeholder:text-white/20 focus:border-white/45 disabled:text-white/40"
              />
              <input
                disabled={recordComplete}
                value={quoteUrl}
                onChange={(event) => setQuoteUrl(event.target.value)}
                placeholder="Public quote-post link"
                className="w-full border border-white/15 bg-white/5 px-3 py-3 text-xs text-white outline-none placeholder:text-white/20 focus:border-white/45 disabled:text-white/40"
              />
              <button
                type="button"
                disabled={busy || recordComplete || formDone < 3}
                onClick={() => void submitRecord()}
                className="log w-full border border-white/30 bg-white/90 px-4 py-3 text-black disabled:cursor-not-allowed disabled:opacity-25"
              >
                {busy
                  ? "TRANSMITTING..."
                  : recordComplete
                    ? "RECORD FILED"
                    : "FILE OBSERVATION"}
              </button>
            </div>
          </section>
        </div>
        <p className="log min-h-5 text-[0.6rem] text-white/70">{notice}</p>

        <div className="border-l border-white/20 pl-4">
          <p className="mt-1 text-[0.65rem] leading-5 text-white/50">
            The console records sequence only. Mission control checks the public
            quote before selection.
          </p>
        </div>
        <div className="border-l border-white/20 pl-4">
          <p className="mt-1 text-[0.65rem] leading-5 text-white/50">
            Keep watching the <a href={campaign.campaign.accountUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Orbitals</a> Station. Every activity logged there brings you closer to being chosen. Remember, the margin for error in the cosmos is zero. 

          </p>
        </div>
         <div className="border-l border-white/20 pl-4">
          <p className="mt-1 text-[0.65rem] leading-5 text-white/50">
            The Station is watching...
          </p>
        </div>
      </div>
    </section>
  );
}

function gateTasks(
  tasks: Record<string, TaskStatus>,
  postLive: boolean,
): Record<string, TaskStatus> {
  const next = { ...tasks };
  if (!postLive) {
    for (const key of ["like", "repost", "quote"] as const) {
      if (next[key] !== "done") next[key] = "locked";
    }
    return next;
  }
  if (next.follow === "done" && next.like === "locked") next.like = "ready";
  return next;
}

function stationNotice(data: CampaignState): string {
  if (data.quoteUrl) return "Record received. Awaiting review.";
  if (!data.campaign.postLive) {
    return "Follow is open. Like, repost, and quote unlock when the station posts.";
  }
  return "Complete the signal path to open the observer record.";
}

function statusLabel(status: TaskStatus): string {
  if (status === "syncing") return "TAP TO VERIFY";
  if (status === "done") return "RECEIVED";
  if (status === "ready") return "OPEN";
  return "LOCKED";
}

function VerifyingRoller() {
  return (
    <span
      className="flex w-7 shrink-0 items-center justify-center"
      aria-label="Verifying"
    >
      <span className="relative block size-3 animate-spin rounded-full border border-white/20 border-t-white/80" />
    </span>
  );
}

function xIntent(task: string, campaign: CampaignState["campaign"]): string {
  const postId = campaign.postUrl.match(/\/status\/(\d+)/)?.[1] ?? "";
  const account =
    new URL(campaign.accountUrl).pathname.split("/").filter(Boolean)[0] ??
    "orbitals";
  if (task === "follow")
    return `https://x.com/intent/follow?screen_name=${encodeURIComponent(account)}`;
  if (task === "like")
    return `https://x.com/intent/like?tweet_id=${encodeURIComponent(postId)}`;
  if (task === "repost")
    return `https://x.com/intent/retweet?tweet_id=${encodeURIComponent(postId)}`;
  const params = new URLSearchParams({
    text: "Reporting live from the station: the recovered Resonance Log has been observed.\n\nRegistered with the crew to track the archive and relay its transmissions.\n\nWe are watching...",
    url: campaign.postUrl,
  });
  return `https://x.com/intent/tweet?${params}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), {
    ...init,
    credentials: "include",
    headers: init?.body
      ? { "content-type": "application/json", ...init.headers }
      : init?.headers,
  });
  const body = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(body.error ?? "Station request failed.");
  return body;
}

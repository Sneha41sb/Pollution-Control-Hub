import { useEffect, useState } from 'react';

const STORAGE_KEY = 'pollution-community-reports';
const VOTES_STORAGE_KEY = 'pollution-community-votes';
const VOTE_THRESHOLD = 5;
const X_DAYS = 7;

function readReports() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function readVotedIds() {
  try {
    const raw = localStorage.getItem(VOTES_STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

export default function CommunityHub() {
  const [reports, setReports] = useState(() => readReports());
  const [votedIds, setVotedIds] = useState(() => readVotedIds());
  const [filter, setFilter] = useState('All');
  const [form, setForm] = useState({
    title: '',
    description: '',
    image: ''
  });
  const [fileInputKey, setFileInputKey] = useState(Date.now());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
  }, [reports]);

  useEffect(() => {
    localStorage.setItem(VOTES_STORAGE_KEY, JSON.stringify([...votedIds]));
  }, [votedIds]);

  const onSubmit = (event) => {
    event.preventDefault();
    if (!form.title.trim() || !form.description.trim()) return;

    const newReport = {
      id: crypto.randomUUID(),
      title: form.title.trim(),
      description: form.description.trim(),
      image: form.image,
      votes: 0,
      createdAt: new Date().toISOString(),
      status:"Pending",
      verifiedAt: "",
      moderationNotes:"",
    };

    setReports((prev) => [newReport, ...prev]);
    setForm({ title: '', description: '', image: '' });
    setFileInputKey(Date.now());
  };

  const uploadImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({ ...prev, image: String(reader.result) }));
    };
    reader.readAsDataURL(file);
  };

  const vote = (id) => {
    if (votedIds.has(id)) return;

    setReports((prev) =>
      prev.map((report) => {
        if (report.id !== id) return report;

        const nextVotes = report.votes + 1;
        const createdDate = new Date(report.createdAt);
        const ageInDays = (new Date() - createdDate) / (1000 * 60 * 60 * 24);
        
        let updatedStatus = report.status;
        let verifiedAtTimestamp = report.verifiedAt;
        let notes = report.moderationNotes;

        if (nextVotes >= VOTE_THRESHOLD && ageInDays <= X_DAYS && report.status === "Pending") {
          updatedStatus = "Verified (community)";
          verifiedAtTimestamp = new Date().toISOString();
          notes = "Automatically verified via community consensus upvotes.";
        }

        return { 
          ...report, 
          votes: nextVotes, 
          status: updatedStatus,
          verifiedAt: verifiedAtTimestamp,
          moderationNotes: notes
        };
      })
    );

    setVotedIds((prev) => new Set(prev).add(id));
  };

  const filteredReports = reports.filter((report) => {
    if (filter === 'All') return true;
    if (filter === 'Verified') return report.status.startsWith('Verified');
    return report.status === filter;
  });

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Community Contribution</h2>
        <p>Report local pollution issues with evidence and crowd voting</p>
      </div>

      <form className="community-form" onSubmit={onSubmit}>
        <input
          type="text"
          value={form.title}
          placeholder="Issue title (e.g., Garbage burning)"
          onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
        />
        <textarea
          value={form.description}
          placeholder="Describe location and issue details"
          onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
        />
        <input key={fileInputKey} type="file" accept="image/*" onChange={uploadImage} />
        <button type="submit">Submit Report</button>
      </form>

      <div className="filter-tabs" style={{ display: 'flex', gap: '8px', margin: '15px 0' }}>
        {['All', 'Pending', 'Verified', 'Addressed'].map((statusOption) => (
          <button
            key={statusOption}
            type="button"
            onClick={() => setFilter(statusOption)}
            style={{
              padding: '6px 12px',
              cursor: 'pointer',
              fontWeight: filter === statusOption ? 'bold' : 'normal'
            }}
          >
            {statusOption}
          </button>
        ))}
      </div>

      <div className="report-feed">
        {filteredReports.length === 0 ? (
          <p>No reports yet. Be the first to raise an issue.</p>
        ) : (
          filteredReports.map((report) => (
            <article className="report-card" key={report.id}>
              <div className="report-head">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h3>{report.title}</h3>
                  <span className="status-badge" style={{ fontSize: '0.8rem', padding: '2px 6px', border: '1px solid #ccc', borderRadius: '4px' }}>
                    {report.status}
                  </span>
                </div>
                <button onClick={() => vote(report.id)} type="button" disabled={votedIds.has(report.id)}>
                  {votedIds.has(report.id) ? 'Voted' : 'Upvote'} ({report.votes})
                </button>
              </div>
              <p>{report.description}</p>
              {report.image && <img src={report.image} alt={report.title} />}

              <div className="timeline-workflow" style={{ marginTop: '12px', fontSize: '0.8rem', color: '#666' }}>
                <span>Created</span>
                <span style={{ color: report.status.startsWith('Verified') || report.status === 'Addressed' ? '#000' : '#ccc' }}>
                  {" → "}Community verified
                </span>
                <span style={{ color: report.status === 'Addressed' ? '#000' : '#ccc' }}>
                  {" → "}Addressed
                </span>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
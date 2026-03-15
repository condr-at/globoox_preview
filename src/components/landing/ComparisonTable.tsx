export function ComparisonTable() {
  const rows = [
    { label: 'Monthly Book Limit', free: '2 Books', scholar: '15 Books', unlimited: 'No Limit' },
    { label: 'Translation Accuracy', free: 'Standard', scholar: 'High (Nuance™)', unlimited: 'Highest (Creative)' },
    { label: 'Cultural Idiom Support', free: '—', scholar: '✓', unlimited: '✓' },
    { label: 'Device Sync', free: '1 Device', scholar: '3 Devices', unlimited: 'Unlimited' },
    { label: 'Export to e-Reader', free: '—', scholar: '✓', unlimited: '✓' },
    { label: 'Audio-Book Generation', free: '—', scholar: '—', unlimited: '✓' },
  ];

  return (
    <table
      style={{
        width: '100%',
        borderCollapse: 'collapse',
        marginTop: '40px',
        background: '#FFFFFF',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
        border: '1px solid rgba(0,0,0,0.06)',
      }}
    >
      <thead>
        <tr>
          <th
            style={{
              textAlign: 'left',
              padding: '24px 32px',
              background: '#FAF9F7',
              fontFamily: "'Lora', serif",
              fontSize: '18px',
              borderBottom: '1px solid rgba(0,0,0,0.05)',
              fontWeight: 400,
              color: '#1A1F2B',
              width: '40%',
            }}
          >
            Features
          </th>
          <th
            style={{
              textAlign: 'center',
              padding: '24px 32px',
              background: '#FAF9F7',
              fontFamily: "'Lora', serif",
              fontSize: '18px',
              borderBottom: '1px solid rgba(0,0,0,0.05)',
              fontWeight: 400,
              color: '#1A1F2B',
              width: '20%',
            }}
          >
            Free
          </th>
          <th
            style={{
              textAlign: 'center',
              padding: '24px 32px',
              background: '#FAF9F7',
              fontFamily: "'Lora', serif",
              fontSize: '18px',
              borderBottom: '1px solid rgba(0,0,0,0.05)',
              fontWeight: 400,
              color: '#B25032',
              width: '20%',
            }}
          >
            Scholar
          </th>
          <th
            style={{
              textAlign: 'center',
              padding: '24px 32px',
              background: '#FAF9F7',
              fontFamily: "'Lora', serif",
              fontSize: '18px',
              borderBottom: '1px solid rgba(0,0,0,0.05)',
              fontWeight: 400,
              color: '#1A1F2B',
              width: '20%',
            }}
          >
            Unlimited
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, idx) => (
          <tr key={idx}>
            <td
              style={{
                padding: '20px 32px',
                borderBottom: idx === rows.length - 1 ? 'none' : '1px solid rgba(0,0,0,0.05)',
                fontSize: '15px',
                color: '#1A1F2B',
                fontWeight: 500,
                width: '40%',
              }}
            >
              {row.label}
            </td>
            <td
              style={{
                padding: '20px 32px',
                borderBottom: idx === rows.length - 1 ? 'none' : '1px solid rgba(0,0,0,0.05)',
                fontSize: '15px',
                color: '#5E6771',
                width: '20%',
                textAlign: 'center',
              }}
            >
              {row.free}
            </td>
            <td
              style={{
                padding: '20px 32px',
                borderBottom: idx === rows.length - 1 ? 'none' : '1px solid rgba(0,0,0,0.05)',
                fontSize: '15px',
                color: '#5E6771',
                width: '20%',
                textAlign: 'center',
              }}
            >
              {row.scholar}
            </td>
            <td
              style={{
                padding: '20px 32px',
                borderBottom: idx === rows.length - 1 ? 'none' : '1px solid rgba(0,0,0,0.05)',
                fontSize: '15px',
                color: '#5E6771',
                width: '20%',
                textAlign: 'center',
              }}
            >
              {row.unlimited}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

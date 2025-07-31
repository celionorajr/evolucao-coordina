const tamanhosExamesMB = {
  ressonancia: 500,
  tomografia: 260,
  raiox: 200,
  ultrassom: 150,
  densitometria: 100,
  hemodinamica: 646
};

document.getElementById('calculate-btn').addEventListener('click', () => {
  const unidade = document.getElementById('unidade').value;
  if (!unidade) {
    alert("Digite o nome da unidade antes de calcular.");
    return;
  }

  const exames = {
    ressonancia: parseInt(document.getElementById('ressonancia-qtd').value || 0),
    tomografia: parseInt(document.getElementById('tomografia-qtd').value || 0),
    raiox: parseInt(document.getElementById('raiox-qtd').value || 0),
    ultrassom: parseInt(document.getElementById('ultrassom-qtd').value || 0),
    densitometria: parseInt(document.getElementById('densitometria-qtd').value || 0),
    hemodinamica: parseInt(document.getElementById('hemodinamica-qtd').value || 0)
  };

  let resultadoHtml = `<h3>Resultados - Unidade: ${unidade}</h3><ul>`;

  Object.entries(exames).forEach(([tipo, qtd]) => {
    const totalDiario = tamanhosExamesMB[tipo] * qtd;
    const totalMensal = totalDiario * 30;
    const totalAnual = totalMensal * 12;

    resultadoHtml += `<li>${tipo}: Diário ${formatarMB(totalDiario)} / Mensal ${formatarMB(totalMensal)} / Anual ${formatarMB(totalAnual)}</li>`;
  });

  resultadoHtml += `</ul>`;
  document.getElementById('resultado').innerHTML = resultadoHtml;
  document.getElementById('resultsSection').style.display = 'block';
});

function formatarMB(valorMB) {
  if (valorMB >= 1024 * 1024) return (valorMB / 1024 / 1024).toFixed(2) + " TB";
  if (valorMB >= 1024) return (valorMB / 1024).toFixed(2) + " GB";
  return valorMB.toFixed(2) + " MB";
}

document.getElementById('generate-pdf').addEventListener('click', async function() {
  const btn = this;
  const originalText = btn.textContent;
  btn.textContent = "Gerando...";
  btn.disabled = true;

  try {
    const unidade = document.getElementById('unidade').value;
    const html = document.getElementById('resultado').innerHTML;

    const resp = await fetch('/generate-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unidade, html })
    });

    if (!resp.ok) throw new Error("Erro no servidor");
    alert("PDF gerado com sucesso!");
    window.scrollTo({ top: 0, behavior: 'smooth' });

  } catch (e) {
    alert("Erro ao gerar PDF: " + e.message);
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
});

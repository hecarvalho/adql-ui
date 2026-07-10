const tableBuilderData = {
  kicker: "Tabela comparativa",
  title: "Tentativas e conclusões",
  subtitle: "Brasil × Noruega • Comparação direta",
  code: "C-06",

  sectionLabel: "Dados",
  sectionTitle: "Tabela de comparação",
  sectionText: "Informações organizadas em linhas e colunas.",

  columns: [
    {
      id: "col-selecao",
      label: "Seleção"
    },
    {
      id: "col-tentados",
      label: "Tentados"
    },
    {
      id: "col-completos",
      label: "Completos"
    }
  ],

  rows: [
    {
      id: "row-brasil",
      cells: {
        "col-selecao": "Brasil",
        "col-tentados": "12",
        "col-completos": "0"
      }
    },
    {
      id: "row-noruega",
      cells: {
        "col-selecao": "Noruega",
        "col-tentados": "13",
        "col-completos": "3"
      }
    }
  ],

  noteText: "Use a tabela para comparar informações de forma direta e objetiva.",
  source: "Dados próprios • Modelo ADQL"
};

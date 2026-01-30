import React, { useState, useMemo, useEffect } from 'react';

// ========================================
// 株式会社TOE 見積管理システム
// キャッシュフロー分析 & 営業管理機能付き
// Supabase連携版
// ========================================

// Supabase設定
const SUPABASE_URL = 'https://dywpvgnusacbnqwrcmnx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ySk8ErtVF9TYdT-D-Q49Zw_jPe_DtUp';

// Cloudflare Workers URL（AI機能用 - 後で設定）
const AI_PROXY_URL = 'https://toe-ai-proxy.joe-fde.workers.dev';

// Supabaseクライアント関数
const supabase = {
  async fetch(table, method = 'GET', body = null, id = null) {
    const url = id 
      ? `${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`
      : `${SUPABASE_URL}/rest/v1/${table}`;
    
    const headers = {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': method === 'POST' ? 'return=representation' : undefined,
    };
    
    const options = {
      method,
      headers: Object.fromEntries(Object.entries(headers).filter(([_, v]) => v)),
    };
    
    if (body && (method === 'POST' || method === 'PATCH')) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`Supabase error: ${response.status}`);
    }
    
    if (method === 'DELETE') return null;
    return response.json();
  },
  
  async getAll(table) {
    return this.fetch(table, 'GET');
  },
  
  async insert(table, data) {
    return this.fetch(table, 'POST', data);
  },
  
  async update(table, id, data) {
    const url = `${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`;
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(data),
    });
    return response.json();
  },
  
  async delete(table, id) {
    const url = `${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`;
    await fetch(url, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });
  },
};

// ユーティリティ関数（先に定義）
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(amount);
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
};

const calculateTotal = (items) => {
  return items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
};

const calculateTax = (amount) => Math.floor(amount * 0.1);

// サンプルデータ生成関数
const generateSampleEstimates = () => {
  const clients = [
    { name: '株式会社サンプル', contact: '山田太郎' },
    { name: '有限会社テスト', contact: '鈴木花子' },
    { name: '株式会社ABC', contact: '田中一郎' },
    { name: '株式会社デモ', contact: '佐藤次郎' },
    { name: '合同会社XYZ', contact: '高橋美咲' },
    { name: '株式会社イノベーション', contact: '伊藤健太' },
    { name: '有限会社クリエイト', contact: '渡辺由美' },
    { name: '株式会社テクノロジー', contact: '小林誠' },
    { name: '合同会社ビジネス', contact: '加藤恵' },
    { name: '株式会社フューチャー', contact: '吉田翔' },
    { name: '有限会社デジタル', contact: '山本愛' },
    { name: '株式会社ソリューション', contact: '中村大輔' },
    { name: '合同会社プランニング', contact: '松本さやか' },
    { name: '株式会社メディア', contact: '井上拓也' },
    { name: '有限会社コンサル', contact: '木村真理' },
    { name: '株式会社グローバル', contact: '林健一' },
    { name: '合同会社スタート', contact: '清水美穂' },
    { name: '株式会社ネクスト', contact: '森田淳' },
    { name: '有限会社パートナー', contact: '阿部絵里' },
    { name: '株式会社エンタープライズ', contact: '石川達也' },
  ];

  const projects = [
    { name: 'コーポレートサイトリニューアル', items: [
      { name: 'Webデザイン', quantity: 1, unitPrice: 500000 },
      { name: 'コーディング', quantity: 1, unitPrice: 300000 },
      { name: 'CMS導入', quantity: 1, unitPrice: 200000 },
    ]},
    { name: 'AI業務効率化コンサルティング', items: [
      { name: '現状分析', quantity: 1, unitPrice: 150000 },
      { name: 'AI導入支援', quantity: 3, unitPrice: 200000 },
      { name: '運用サポート（月額）', quantity: 6, unitPrice: 50000 },
    ]},
    { name: 'ECサイト構築', items: [
      { name: 'ECサイト設計', quantity: 1, unitPrice: 400000 },
      { name: 'カート機能開発', quantity: 1, unitPrice: 600000 },
      { name: '決済連携', quantity: 1, unitPrice: 300000 },
    ]},
    { name: 'ランディングページ制作', items: [
      { name: 'LPデザイン', quantity: 1, unitPrice: 200000 },
      { name: 'コーディング', quantity: 1, unitPrice: 100000 },
    ]},
    { name: '採用サイト制作', items: [
      { name: 'サイト設計', quantity: 1, unitPrice: 250000 },
      { name: 'デザイン', quantity: 1, unitPrice: 350000 },
      { name: '動画制作', quantity: 3, unitPrice: 100000 },
    ]},
    { name: 'SNSマーケティング支援', items: [
      { name: '戦略立案', quantity: 1, unitPrice: 200000 },
      { name: 'コンテンツ制作', quantity: 10, unitPrice: 30000 },
      { name: '運用代行（月額）', quantity: 3, unitPrice: 100000 },
    ]},
    { name: '業務システム開発', items: [
      { name: '要件定義', quantity: 1, unitPrice: 300000 },
      { name: 'システム設計', quantity: 1, unitPrice: 400000 },
      { name: '開発', quantity: 1, unitPrice: 800000 },
      { name: 'テスト', quantity: 1, unitPrice: 200000 },
    ]},
    { name: 'ブランディング支援', items: [
      { name: 'ブランド戦略', quantity: 1, unitPrice: 500000 },
      { name: 'ロゴデザイン', quantity: 1, unitPrice: 300000 },
      { name: 'ガイドライン作成', quantity: 1, unitPrice: 200000 },
    ]},
    { name: 'SEO対策', items: [
      { name: 'サイト分析', quantity: 1, unitPrice: 100000 },
      { name: 'コンテンツ最適化', quantity: 1, unitPrice: 150000 },
      { name: '月次レポート', quantity: 6, unitPrice: 50000 },
    ]},
    { name: 'アプリ開発', items: [
      { name: 'UI/UXデザイン', quantity: 1, unitPrice: 400000 },
      { name: 'iOS開発', quantity: 1, unitPrice: 600000 },
      { name: 'Android開発', quantity: 1, unitPrice: 600000 },
      { name: '保守（月額）', quantity: 3, unitPrice: 80000 },
    ]},
  ];

  const stages = [
    { id: 'proposal', status: '提案中', prob: [30, 40, 50, 60, 70] },
    { id: 'won', status: '成約', prob: [100] },
    { id: 'completed', status: '入金済', prob: [100] },
    { id: 'lost', status: '失注', prob: [0] },
  ];

  const estimates = [];
  const now = new Date();
  
  for (let i = 0; i < 100; i++) {
    const client = clients[i % clients.length];
    const project = projects[i % projects.length];
    const stageIndex = Math.floor(Math.random() * stages.length);
    const stage = stages[stageIndex];
    const prob = stage.prob[Math.floor(Math.random() * stage.prob.length)];
    
    // 過去12ヶ月にランダムに分散
    const monthsAgo = Math.floor(Math.random() * 12);
    const daysAgo = Math.floor(Math.random() * 30);
    const createdDate = new Date(now);
    createdDate.setMonth(createdDate.getMonth() - monthsAgo);
    createdDate.setDate(createdDate.getDate() - daysAgo);
    
    const validUntil = new Date(createdDate);
    validUntil.setMonth(validUntil.getMonth() + 1);
    
    const expectedPayment = new Date(createdDate);
    expectedPayment.setMonth(expectedPayment.getMonth() + 2 + Math.floor(Math.random() * 3));
    
    // 価格をランダムに調整
    const priceMultiplier = 0.7 + Math.random() * 0.6;
    const adjustedItems = project.items.map(item => ({
      ...item,
      unitPrice: Math.round(item.unitPrice * priceMultiplier / 10000) * 10000
    }));

    // 失注理由（失注の場合のみ）
    const lostReasonCodes = ['A-01', 'A-02', 'A-03', 'B-01', 'B-02', 'B-03', 'C-01', 'C-02', 'D-01', 'D-02', 'E-01', 'E-02'];
    const lostReasonNotes = [
      '他社より20%安い見積もりが出た',
      'デザインの方向性が合わなかった',
      '決裁者との面談機会を得られなかった',
      '納期が間に合わなかった',
      'プロジェクト自体が延期になった',
      '',
      '',
    ];

    estimates.push({
      id: `EST-${createdDate.getFullYear()}-${String(i + 1).padStart(3, '0')}`,
      clientName: client.name,
      clientContact: client.contact,
      projectName: project.name,
      items: adjustedItems,
      status: stage.status,
      createdAt: createdDate.toISOString().split('T')[0],
      validUntil: validUntil.toISOString().split('T')[0],
      expectedPayment: expectedPayment.toISOString().split('T')[0],
      paidAt: stage.id === 'completed' ? expectedPayment.toISOString().split('T')[0] : null,
      probability: prob,
      notes: i % 3 === 0 ? '優先対応' : i % 5 === 0 ? '競合あり' : '',
      salesStage: stage.id,
      lostReason: stage.id === 'lost' ? lostReasonCodes[i % lostReasonCodes.length] : '',
      lostReasonNote: stage.id === 'lost' ? lostReasonNotes[i % lostReasonNotes.length] : '',
    });
  }
  
  return estimates;
};

const generateSampleInvoices = (estimates) => {
  const invoices = [];
  let invoiceCount = 0;
  
  estimates.forEach((est, index) => {
    if (est.salesStage === 'completed' || est.salesStage === 'won') {
      const amount = calculateTotal(est.items);
      const issuedDate = new Date(est.createdAt);
      issuedDate.setDate(issuedDate.getDate() + 7);
      
      const expectedPayment = new Date(issuedDate);
      expectedPayment.setMonth(expectedPayment.getMonth() + 1);
      
      invoices.push({
        id: `INV-${issuedDate.getFullYear()}-${String(invoiceCount + 1).padStart(3, '0')}`,
        estimateId: est.id,
        clientName: est.clientName,
        items: est.items,
        amount: amount,
        tax: calculateTax(amount),
        total: amount + calculateTax(amount),
        issuedAt: issuedDate.toISOString().split('T')[0],
        expectedPayment: expectedPayment.toISOString().split('T')[0],
        paidAt: est.salesStage === 'completed' ? est.paidAt : null,
        status: est.salesStage === 'completed' ? '入金済' : '未入金'
      });
      invoiceCount++;
    }
  });
  
  return invoices;
};

// サンプルリードデータ生成
const generateSampleLeads = () => {
  const companies = [
    { name: '株式会社ニューホープ', contact: '岡田健一', email: 'okada@newhope.co.jp', tel: '03-1234-5678' },
    { name: '有限会社サクセス', contact: '西村美紀', email: 'nishimura@success.jp', tel: '06-2345-6789' },
    { name: '株式会社ブライト', contact: '藤井大輝', email: 'fujii@bright.co.jp', tel: '092-3456-7890' },
    { name: '合同会社リンク', contact: '坂本あゆみ', email: 'sakamoto@link.jp', tel: '052-4567-8901' },
    { name: '株式会社アドバンス', contact: '前田誠', email: 'maeda@advance.co.jp', tel: '011-5678-9012' },
    { name: '有限会社ウェーブ', contact: '川口千尋', email: 'kawaguchi@wave.jp', tel: '078-6789-0123' },
    { name: '株式会社エクセル', contact: '内田勇気', email: 'uchida@excel.co.jp', tel: '045-7890-1234' },
  ];
  
  const sources = ['Web問い合わせ', '紹介', '展示会', 'セミナー', 'テレアポ', 'SNS'];
  const statuses = [
    { id: 'new', label: '新規' },
    { id: 'contact', label: '接触中' },
    { id: 'meeting', label: '商談中' },
    { id: 'proposal', label: '提案準備' },
    { id: 'lost', label: '失注' },
  ];
  
  const leads = [];
  const now = new Date();
  
  for (let i = 0; i < 15; i++) {
    const company = companies[i % companies.length];
    const status = statuses[Math.floor(Math.random() * (statuses.length - 1))]; // lostは少なめに
    const createdDate = new Date(now);
    createdDate.setDate(createdDate.getDate() - Math.floor(Math.random() * 90));
    
    const nextActionDate = new Date(createdDate);
    nextActionDate.setDate(nextActionDate.getDate() + Math.floor(Math.random() * 14) + 1);
    
    leads.push({
      id: `LEAD-${createdDate.getFullYear()}-${String(i + 1).padStart(3, '0')}`,
      companyName: company.name,
      contactName: company.contact,
      email: company.email,
      tel: company.tel,
      source: sources[Math.floor(Math.random() * sources.length)],
      status: status.id,
      statusLabel: status.label,
      projectName: i % 3 === 0 ? 'Webサイト制作' : i % 3 === 1 ? 'システム開発' : 'コンサルティング',
      expectedAmount: Math.floor(Math.random() * 10 + 1) * 500000,
      nextAction: status.id === 'new' ? '初回連絡' : status.id === 'contact' ? 'ヒアリング' : '提案書作成',
      nextActionDate: nextActionDate.toISOString().split('T')[0],
      notes: i % 4 === 0 ? '急ぎ案件' : '',
      createdAt: createdDate.toISOString().split('T')[0],
      updatedAt: createdDate.toISOString().split('T')[0],
    });
  }
  
  return leads;
};

const INITIAL_ESTIMATES = generateSampleEstimates();
const INITIAL_INVOICES = generateSampleInvoices(INITIAL_ESTIMATES);
const INITIAL_LEADS = generateSampleLeads();

// ========================================
// メインアプリケーション
// ========================================
export default function EstimateManagementSystem() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [estimates, setEstimates] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [leads, setLeads] = useState([]);
  const [selectedEstimate, setSelectedEstimate] = useState(null);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfType, setPdfType] = useState('estimate');
  const [isLoading, setIsLoading] = useState(true);
  const [dbConnected, setDbConnected] = useState(false);
  
  // 決算月設定（5月決算 = 会計年度は6月始まり）
  const [fiscalYearEndMonth, setFiscalYearEndMonth] = useState(5);

  // Supabaseからデータを読み込み
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Supabaseからデータ取得を試みる
        const [estData, invData, leadData] = await Promise.all([
          supabase.getAll('estimates'),
          supabase.getAll('invoices'),
          supabase.getAll('leads'),
        ]);
        
        // データがある場合はSupabaseのデータを使用
        if (estData && estData.length > 0) {
          setEstimates(estData.map(e => ({
            ...e,
            items: typeof e.items === 'string' ? JSON.parse(e.items) : e.items || []
          })));
          setDbConnected(true);
        } else {
          // Supabaseが空の場合、サンプルデータを投入
          setEstimates(INITIAL_ESTIMATES);
          // サンプルデータをSupabaseに保存
          for (const est of INITIAL_ESTIMATES) {
            await supabase.insert('estimates', {
              ...est,
              items: JSON.stringify(est.items)
            });
          }
          setDbConnected(true);
        }
        
        if (invData && invData.length > 0) {
          setInvoices(invData.map(i => ({
            ...i,
            items: typeof i.items === 'string' ? JSON.parse(i.items) : i.items || []
          })));
        } else {
          setInvoices(INITIAL_INVOICES);
          for (const inv of INITIAL_INVOICES) {
            await supabase.insert('invoices', {
              ...inv,
              items: JSON.stringify(inv.items)
            });
          }
        }
        
        if (leadData && leadData.length > 0) {
          setLeads(leadData);
        } else {
          setLeads(INITIAL_LEADS);
          for (const lead of INITIAL_LEADS) {
            await supabase.insert('leads', lead);
          }
        }
        
      } catch (error) {
        console.error('Supabase接続エラー:', error);
        // エラー時はローカルデータを使用
        setEstimates(INITIAL_ESTIMATES);
        setInvoices(INITIAL_INVOICES);
        setLeads(INITIAL_LEADS);
        setDbConnected(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);

  // 見積をSupabaseに保存する関数
  const saveEstimate = async (estimate, isNew = false) => {
    const dataToSave = {
      ...estimate,
      items: JSON.stringify(estimate.items)
    };
    
    try {
      if (isNew) {
        await supabase.insert('estimates', dataToSave);
      } else {
        await supabase.update('estimates', estimate.id, dataToSave);
      }
    } catch (error) {
      console.error('見積保存エラー:', error);
    }
  };

  // 請求をSupabaseに保存する関数
  const saveInvoice = async (invoice, isNew = false) => {
    const dataToSave = {
      ...invoice,
      items: JSON.stringify(invoice.items)
    };
    
    try {
      if (isNew) {
        await supabase.insert('invoices', dataToSave);
      } else {
        await supabase.update('invoices', invoice.id, dataToSave);
      }
    } catch (error) {
      console.error('請求保存エラー:', error);
    }
  };

  // リードをSupabaseに保存する関数
  const saveLead = async (lead, isNew = false) => {
    try {
      if (isNew) {
        await supabase.insert('leads', lead);
      } else {
        await supabase.update('leads', lead.id, lead);
      }
    } catch (error) {
      console.error('リード保存エラー:', error);
    }
  };

  // 会社情報（編集可能）
  const [companyInfo, setCompanyInfo] = useState({
    name: '株式会社TOE',
    zip: '〒812-0011',
    address: '福岡県福岡市博多区博多駅前3-25-24',
    building: '八百治ビル4F',
    tel: '092-409-9669',
    fax: '092-409-9670',
    email: 'info@toe.co.jp',
    banks: [
      { name: '西日本シティ銀行', branch: '博多駅前支店', type: '普通', number: '1234567', holder: 'カ）トウ' },
      { name: '福岡銀行', branch: '博多駅東支店', type: '普通', number: '7654321', holder: 'カ）トウ' }
    ]
  });

  // 取引先データ
  const [clients, setClients] = useState(() => {
    // 既存の見積・請求からユニークな取引先を抽出してサンプルデータ作成
    const clientNames = ['株式会社山田製作所', '田中商事株式会社', '鈴木工業株式会社', 'ABCホールディングス', '福岡デザインオフィス',
      'グローバルテック株式会社', '九州物産株式会社', 'イノベーションラボ', 'クリエイティブワークス', 'デジタルソリューションズ'];
    return clientNames.map((name, idx) => ({
      id: `CLI-${String(idx + 1).padStart(3, '0')}`,
      name,
      contactName: ['山田太郎', '田中花子', '鈴木一郎', '佐藤美咲', '高橋健太', '伊藤真理', '渡辺大輔', '小林さくら', '加藤隆', '吉田恵'][idx],
      email: `contact@${['yamada', 'tanaka', 'suzuki', 'abc', 'fdo', 'globaltech', 'kyushu', 'innovlab', 'creativeworks', 'digisol'][idx]}.co.jp`,
      tel: `092-${String(100 + idx).padStart(3, '0')}-${String(1000 + idx * 111).padStart(4, '0')}`,
      zip: '〒810-000' + idx,
      address: `福岡県福岡市中央区天神${idx + 1}-${idx + 1}-${idx + 1}`,
      notes: '',
      createdAt: new Date(2024, idx % 12, (idx * 3) % 28 + 1).toISOString().split('T')[0],
    }));
  });

  // 設定・取引先モーダル
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showClientsModal, setShowClientsModal] = useState(false);

  // 統計計算
  const stats = useMemo(() => {
    const totalRevenue = estimates
      .filter(e => e.salesStage === 'completed' || e.salesStage === 'won')
      .reduce((sum, e) => sum + calculateTotal(e.items), 0);

    const pipeline = estimates
      .filter(e => !['completed', 'lost'].includes(e.salesStage))
      .reduce((sum, e) => sum + (calculateTotal(e.items) * e.probability / 100), 0);

    const unpaidInvoices = invoices
      .filter(i => i.status === '未入金')
      .reduce((sum, i) => sum + i.total, 0);
    
    const activeLeads = leads.filter(l => l.status !== 'converted' && l.status !== 'lost').length;

    return { totalRevenue, pipeline, unpaidInvoices, activeLeads };
  }, [estimates, invoices, leads]);

  const tabs = [
    { id: 'dashboard', label: 'ダッシュボード', icon: '📊' },
    { id: 'estimates', label: '見積管理', icon: '📝' },
    { id: 'invoices', label: '請求管理', icon: '💴' },
    { id: 'cashflow', label: 'キャッシュフロー', icon: '📈' },
    { id: 'sales', label: '営業管理', icon: '🎯' },
  ];

  // ローディング画面
  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '20px',
        color: '#e2e8f0'
      }}>
        <div style={{ fontSize: '48px' }}>📊</div>
        <div style={{ fontSize: '20px' }}>データを読み込み中...</div>
        <div style={{ fontSize: '14px', color: '#94a3b8' }}>Supabaseに接続しています</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* ヘッダー */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.logo}>TOE</h1>
          <span style={styles.logoSub}>見積管理システム</span>
          <span style={{
            marginLeft: '12px',
            padding: '4px 10px',
            borderRadius: '12px',
            fontSize: '11px',
            background: dbConnected ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            color: dbConnected ? '#22c55e' : '#ef4444',
          }}>
            {dbConnected ? '🟢 共有モード' : '🔴 ローカルモード'}
          </span>
        </div>
        <div style={styles.headerRight}>
          <span style={styles.dateDisplay}>{formatDate(new Date().toISOString().split('T')[0])}</span>
          <button 
            style={styles.headerButton}
            onClick={() => setShowClientsModal(true)}
          >
            🏢 取引先
          </button>
          <button 
            style={styles.headerButton}
            onClick={() => setShowSettingsModal(true)}
          >
            ⚙️ 設定
          </button>
        </div>
      </header>

      {/* ナビゲーション */}
      <nav style={styles.nav}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              ...styles.navButton,
              ...(activeTab === tab.id ? styles.navButtonActive : {})
            }}
          >
            <span style={styles.navIcon}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>

      {/* メインコンテンツ */}
      <main style={styles.main}>
        {activeTab === 'dashboard' && (
          <Dashboard 
            estimates={estimates} 
            invoices={invoices}
            leads={leads}
            stats={stats}
            onViewEstimate={(est) => {
              setSelectedEstimate(est);
              setPdfType('estimate');
              setShowPdfModal(true);
            }}
          />
        )}
        {activeTab === 'estimates' && (
          <EstimateList 
            estimates={estimates}
            onView={(est) => {
              setSelectedEstimate(est);
              setPdfType('estimate');
              setShowPdfModal(true);
            }}
            onCreateInvoice={async (est) => {
              const newInvoice = {
                id: `INV-2025-${String(invoices.length + 1).padStart(3, '0')}`,
                estimateId: est.id,
                clientName: est.clientName,
                items: est.items,
                amount: calculateTotal(est.items),
                tax: calculateTax(calculateTotal(est.items)),
                total: calculateTotal(est.items) + calculateTax(calculateTotal(est.items)),
                issuedAt: new Date().toISOString().split('T')[0],
                expectedPayment: '',
                paidAt: null,
                status: '未入金'
              };
              setInvoices([...invoices, newInvoice]);
              await saveInvoice(newInvoice, true);
              alert('請求書を作成しました');
            }}
            onCreateEstimate={async (newEst) => {
              const today = new Date().toISOString().split('T')[0];
              const stageLabels = {
                proposal: '提案中',
                won: '成約', completed: '完了', lost: '失注'
              };
              const estimate = {
                id: `EST-2025-${String(estimates.length + 1).padStart(3, '0')}`,
                clientName: newEst.clientName,
                clientContact: newEst.clientContact,
                projectName: newEst.projectName,
                items: newEst.items,
                status: stageLabels[newEst.salesStage] || '提案中',
                createdAt: today,
                validUntil: newEst.validUntil || today,
                paidAt: null,
                probability: newEst.probability,
                notes: newEst.notes,
                salesStage: newEst.salesStage || 'proposal'
              };
              setEstimates([...estimates, estimate]);
              await saveEstimate(estimate, true);
              alert('見積書を作成しました');
            }}
            onUpdateEstimate={async (updatedEst) => {
              const stageLabels = {
                proposal: '提案中',
                won: '成約', completed: '完了', lost: '失注'
              };
              const updated = { ...updatedEst, status: stageLabels[updatedEst.salesStage] || updatedEst.status };
              setEstimates(estimates.map(e => 
                e.id === updatedEst.id ? updated : e
              ));
              await saveEstimate(updated, false);
              alert('見積書を更新しました');
            }}
          />
        )}
        {activeTab === 'invoices' && (
          <InvoiceList 
            invoices={invoices}
            estimates={estimates}
            onMarkPaid={async (inv) => {
              const updated = { ...inv, paidAt: new Date().toISOString().split('T')[0], status: '入金済' };
              setInvoices(invoices.map(i => 
                i.id === inv.id ? updated : i
              ));
              await saveInvoice(updated, false);
            }}
            onView={(inv) => {
              const est = estimates.find(e => e.id === inv.estimateId);
              if (est) {
                setSelectedEstimate({ ...est, invoiceData: inv });
                setPdfType('invoice');
                setShowPdfModal(true);
              } else {
                // 見積がない場合は請求書のデータから作成
                setSelectedEstimate({ 
                  clientName: inv.clientName,
                  items: inv.items || [{ name: '請求金額', quantity: 1, unitPrice: inv.amount }],
                  invoiceData: inv
                });
                setPdfType('invoice');
                setShowPdfModal(true);
              }
            }}
            onCreateInvoice={async (newInv) => {
              const today = new Date().toISOString().split('T')[0];
              const amount = calculateTotal(newInv.items);
              const invoice = {
                id: `INV-2025-${String(invoices.length + 1).padStart(3, '0')}`,
                estimateId: newInv.estimateId || null,
                clientName: newInv.clientName,
                items: newInv.items,
                amount: amount,
                tax: calculateTax(amount),
                total: amount + calculateTax(amount),
                issuedAt: today,
                expectedPayment: newInv.expectedPayment || today,
                paidAt: null,
                status: '未入金',
                notes: newInv.notes
              };
              setInvoices([...invoices, invoice]);
              await saveInvoice(invoice, true);
              alert('請求書を作成しました');
            }}
            onUpdateInvoice={async (updatedInv) => {
              setInvoices(invoices.map(i => 
                i.id === updatedInv.id ? updatedInv : i
              ));
              await saveInvoice(updatedInv, false);
              alert('請求書を更新しました');
            }}
          />
        )}
        {activeTab === 'cashflow' && (
          <CashflowAnalysis 
            estimates={estimates} 
            invoices={invoices} 
            fiscalYearEndMonth={fiscalYearEndMonth}
          />
        )}
        {activeTab === 'sales' && (
          <SalesPipeline 
            estimates={estimates}
            leads={leads}
            onUpdateStage={async (estId, newStage, probability) => {
              const updated = estimates.find(e => e.id === estId);
              if (updated) {
                const newEst = { ...updated, salesStage: newStage, probability };
                setEstimates(estimates.map(e =>
                  e.id === estId ? newEst : e
                ));
                await saveEstimate(newEst, false);
              }
            }}
            onCreateLead={async (newLead) => {
              const today = new Date().toISOString().split('T')[0];
              const lead = {
                id: `LEAD-${new Date().getFullYear()}-${String(leads.length + 1).padStart(3, '0')}`,
                ...newLead,
                createdAt: today,
                updatedAt: today,
              };
              setLeads([...leads, lead]);
              await saveLead(lead, true);
            }}
            onUpdateLead={async (updatedLead) => {
              const updated = { ...updatedLead, updatedAt: new Date().toISOString().split('T')[0] };
              setLeads(leads.map(l => 
                l.id === updatedLead.id ? updated : l
              ));
              await saveLead(updated, false);
            }}
            onConvertToEstimate={async (lead) => {
              const today = new Date().toISOString().split('T')[0];
              const validUntil = new Date();
              validUntil.setMonth(validUntil.getMonth() + 1);
              
              const estimate = {
                id: `EST-${new Date().getFullYear()}-${String(estimates.length + 1).padStart(3, '0')}`,
                clientName: lead.companyName,
                clientContact: lead.contactName,
                projectName: lead.projectName || '新規案件',
                items: [{ name: '見積項目', quantity: 1, unitPrice: lead.expectedAmount || 0 }],
                status: '提案中',
                createdAt: today,
                validUntil: validUntil.toISOString().split('T')[0],
                paidAt: null,
                probability: 50,
                notes: lead.notes || '',
                salesStage: 'proposal'
              };
              setEstimates([...estimates, estimate]);
              await saveEstimate(estimate, true);
              
              const updatedLead2 = { ...lead, status: 'converted', updatedAt: today };
              setLeads(leads.map(l => 
                l.id === lead.id ? updatedLead2 : l
              ));
              await saveLead(updatedLead2, false);
            }}
            fiscalYearEndMonth={fiscalYearEndMonth}
          />
        )}
      </main>

      {/* PDF モーダル */}
      {showPdfModal && selectedEstimate && (
        <PdfModal
          estimate={selectedEstimate}
          type={pdfType}
          onClose={() => setShowPdfModal(false)}
          companyInfo={companyInfo}
        />
      )}

      {/* 設定モーダル */}
      {showSettingsModal && (
        <div style={styles.modalOverlay} onClick={() => setShowSettingsModal(false)}>
          <div style={{ ...styles.createModalContent, maxWidth: '800px' }} onClick={e => e.stopPropagation()}>
            <button style={styles.modalClose} onClick={() => setShowSettingsModal(false)}>×</button>
            <Settings 
              fiscalYearEndMonth={fiscalYearEndMonth}
              onChangeFiscalYearEndMonth={setFiscalYearEndMonth}
              companyInfo={companyInfo}
              onChangeCompanyInfo={setCompanyInfo}
            />
          </div>
        </div>
      )}

      {/* 取引先管理モーダル */}
      {showClientsModal && (
        <div style={styles.modalOverlay} onClick={() => setShowClientsModal(false)}>
          <div style={{ ...styles.createModalContent, maxWidth: '1000px', maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <button style={styles.modalClose} onClick={() => setShowClientsModal(false)}>×</button>
            <ClientManager 
              clients={clients}
              onCreateClient={(newClient) => {
                const client = {
                  id: `CLI-${String(clients.length + 1).padStart(3, '0')}`,
                  ...newClient,
                  createdAt: new Date().toISOString().split('T')[0],
                };
                setClients([...clients, client]);
              }}
              onUpdateClient={(updatedClient) => {
                setClients(clients.map(c => c.id === updatedClient.id ? updatedClient : c));
              }}
              onDeleteClient={(clientId) => {
                if (confirm('この取引先を削除しますか？')) {
                  setClients(clients.filter(c => c.id !== clientId));
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ========================================
// ダッシュボード
// ========================================
function Dashboard({ estimates, invoices, leads, stats, onViewEstimate }) {
  const recentEstimates = [...estimates]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  const overdueInvoices = invoices.filter(inv => {
    if (inv.status === '入金済') return false;
    return new Date(inv.expectedPayment) < new Date();
  });
  
  const activeLeads = leads ? leads.filter(l => !['converted', 'lost'].includes(l.status)).length : 0;

  // 月別入金状況データ（今月含む未来6ヶ月）
  const monthlyPayments = useMemo(() => {
    const months = [];
    const today = new Date();
    
    for (let i = 0; i < 6; i++) {
      const targetDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth() + 1;
      
      // 入金済み金額
      const paid = invoices
        .filter(inv => {
          if (inv.status !== '入金済' || !inv.paidAt) return false;
          const paidDate = new Date(inv.paidAt);
          return paidDate.getFullYear() === year && paidDate.getMonth() + 1 === month;
        })
        .reduce((sum, inv) => sum + inv.total, 0);
      
      // 入金予定（未入金）
      const expected = invoices
        .filter(inv => {
          if (inv.status === '入金済') return false;
          const expectedDate = new Date(inv.expectedPayment);
          return expectedDate.getFullYear() === year && expectedDate.getMonth() + 1 === month;
        })
        .reduce((sum, inv) => sum + inv.total, 0);
      
      months.push({
        month,
        year,
        label: `${month}月`,
        paid,
        expected,
        total: paid + expected,
        isCurrent: i === 0
      });
    }
    return months;
  }, [invoices]);

  const maxPayment = Math.max(...monthlyPayments.map(m => m.total), 1000000);

  return (
    <div style={styles.dashboard}>
      {/* KPIカード */}
      <div style={styles.kpiGrid}>
        <div style={{ ...styles.kpiCard, background: 'linear-gradient(135deg, #1a5f2a 0%, #2d8a3e 100%)' }}>
          <div style={styles.kpiIcon}>💰</div>
          <div style={styles.kpiLabel}>今月の売上</div>
          <div style={styles.kpiValue}>{formatCurrency(stats.totalRevenue)}</div>
        </div>
        <div style={{ ...styles.kpiCard, background: 'linear-gradient(135deg, #1a4a6e 0%, #2d7ab8 100%)' }}>
          <div style={styles.kpiIcon}>📊</div>
          <div style={styles.kpiLabel}>パイプライン（期待値）</div>
          <div style={styles.kpiValue}>{formatCurrency(stats.pipeline)}</div>
        </div>
        <div style={{ ...styles.kpiCard, background: 'linear-gradient(135deg, #8b4513 0%, #cd853f 100%)' }}>
          <div style={styles.kpiIcon}>⏳</div>
          <div style={styles.kpiLabel}>未入金額</div>
          <div style={styles.kpiValue}>{formatCurrency(stats.unpaidInvoices)}</div>
        </div>
        <div style={{ ...styles.kpiCard, background: 'linear-gradient(135deg, #4a1a6e 0%, #7b2db8 100%)' }}>
          <div style={styles.kpiIcon}>👥</div>
          <div style={styles.kpiLabel}>アクティブリード</div>
          <div style={styles.kpiValue}>{activeLeads}件</div>
        </div>
      </div>

      {/* 月別入金状況グラフ */}
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>💴 月別入金予定（今月〜6ヶ月）</h3>
        <div style={styles.chart}>
          <div style={styles.chartYAxis}>
            <span>{formatCurrency(maxPayment)}</span>
            <span>{formatCurrency(maxPayment / 2)}</span>
            <span>¥0</span>
          </div>
          <div style={styles.chartBars}>
            {monthlyPayments.map((data, idx) => (
              <div key={idx} style={styles.chartBarGroup}>
                <div style={styles.chartBarValue}>
                  {data.total > 0 ? `${Math.round(data.total / 10000)}万` : ''}
                </div>
                <div style={styles.chartBarContainer}>
                  {/* 入金済み（緑） */}
                  <div 
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: `${(data.paid / maxPayment) * 100}%`,
                      background: '#22c55e',
                      borderRadius: data.expected > 0 ? '0 0 6px 6px' : '6px',
                    }}
                    title={`${data.year}/${data.month} 入金済: ${formatCurrency(data.paid)}`}
                  />
                  {/* 入金予定（オレンジ） */}
                  {data.expected > 0 && (
                    <div 
                      style={{
                        position: 'absolute',
                        bottom: `${(data.paid / maxPayment) * 100}%`,
                        left: 0,
                        right: 0,
                        height: `${(data.expected / maxPayment) * 100}%`,
                        background: '#f59e0b',
                        borderRadius: '6px 6px 0 0',
                      }}
                      title={`${data.year}/${data.month} 入金予定: ${formatCurrency(data.expected)}`}
                    />
                  )}
                </div>
                <span style={{
                  ...styles.chartLabel,
                  fontWeight: data.isCurrent ? '700' : '400',
                  color: data.isCurrent ? '#60a5fa' : '#94a3b8'
                }}>
                  {data.label}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div style={styles.chartLegend}>
          <span><span style={{ ...styles.legendDot, background: '#22c55e' }} /> 入金済み</span>
          <span><span style={{ ...styles.legendDot, background: '#f59e0b' }} /> 入金予定</span>
        </div>
      </div>

      <div style={styles.dashboardGrid}>
        {/* 最近の見積 */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>最近の見積</h3>
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>見積番号</th>
                  <th style={styles.th}>クライアント</th>
                  <th style={styles.th}>金額</th>
                  <th style={styles.th}>ステータス</th>
                  <th style={styles.th}>操作</th>
                </tr>
              </thead>
              <tbody>
                {recentEstimates.map(est => (
                  <tr key={est.id} style={styles.tr}>
                    <td style={styles.td}>{est.id}</td>
                    <td style={styles.td}>{est.clientName}</td>
                    <td style={styles.tdRight}>{formatCurrency(calculateTotal(est.items))}</td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.badge,
                        background: getBadgeColor(est.salesStage)
                      }}>
                        {est.status}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <button 
                        style={styles.smallButton}
                        onClick={() => onViewEstimate(est)}
                      >
                        表示
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 支払期限超過 */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>⚠️ 支払期限超過</h3>
          {overdueInvoices.length === 0 ? (
            <p style={styles.emptyText}>支払期限超過の請求書はありません</p>
          ) : (
            <div style={styles.alertList}>
              {overdueInvoices.map(inv => (
                <div key={inv.id} style={styles.alertItem}>
                  <div>
                    <strong>{inv.clientName}</strong>
                    <br />
                    <span style={styles.alertMeta}>期限: {formatDate(inv.dueDate)}</span>
                  </div>
                  <div style={styles.alertAmount}>{formatCurrency(inv.total)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 失注理由カテゴリ
const LOST_REASONS = {
  'A': {
    label: 'A. 金額・条件',
    items: [
      { code: 'A-01', label: '単純な予算超過' },
      { code: 'A-02', label: '競合価格負け' },
      { code: 'A-03', label: '費用対効果の不透明さ' },
      { code: 'A-04', label: '保守・運用費の懸念' },
      { code: 'A-05', label: '支払条件の不一致' },
    ]
  },
  'B': {
    label: 'B. 提案・企画',
    items: [
      { code: 'B-01', label: 'ビジネス理解・課題解決力の不足' },
      { code: 'B-02', label: '提案の画一化（テンプレート感）' },
      { code: 'B-03', label: 'デザインテイストの不一致' },
      { code: 'B-04', label: 'Webマーケティング提案の不足' },
      { code: 'B-05', label: '要件定義・機能の不足' },
    ]
  },
  'C': {
    label: 'C. 営業・コミュニケーション',
    items: [
      { code: 'C-01', label: 'レスポンス・対応スピード' },
      { code: 'C-02', label: '担当者との相性・信頼関係' },
      { code: 'C-03', label: '決裁者へのアプローチ失敗' },
      { code: 'C-04', label: 'ヒアリング・深掘り不足' },
    ]
  },
  'D': {
    label: 'D. 技術・リソース',
    items: [
      { code: 'D-01', label: '技術要件のミスマッチ' },
      { code: 'D-02', label: '納期・スケジュールの不一致' },
      { code: 'D-03', label: '実績（ポートフォリオ）不足' },
    ]
  },
  'E': {
    label: 'E. 顧客事情・その他',
    items: [
      { code: 'E-01', label: 'プロジェクトの凍結・延期' },
      { code: 'E-02', label: '既存ベンダー・縁故への発注' },
      { code: 'E-03', label: '内製化への切り替え' },
    ]
  }
};

// ========================================
// 見積一覧
// ========================================
function EstimateList({ estimates, onView, onCreateInvoice, onCreateEstimate, onUpdateEstimate }) {
  const [filter, setFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEstimate, setEditingEstimate] = useState(null);
  
  // ソート機能
  const [sortField, setSortField] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc'); // desc = 新しい順
  
  // AI見積機能用state
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  
  // デフォルトの有効期限（1ヶ月後）
  const getDefaultValidUntil = () => {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    return date.toISOString().split('T')[0];
  };
  
  const [newEstimate, setNewEstimate] = useState({
    clientName: '',
    clientContact: '',
    projectName: '',
    items: [{ name: '', quantity: 1, unitPrice: 0 }],
    validUntil: getDefaultValidUntil(),
    probability: 50,
    salesStage: 'proposal',
    notes: '',
    lostReason: '',
    lostReasonNote: '',
  });

  // ソート処理
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return ' ↕';
    return sortOrder === 'asc' ? ' ↑' : ' ↓';
  };

  const filtered = estimates
    .filter(est => {
      if (filter === 'all') return true;
      return est.salesStage === filter;
    })
    .sort((a, b) => {
      let aVal, bVal;
      switch (sortField) {
        case 'createdAt':
        case 'validUntil':
          aVal = new Date(a[sortField] || 0);
          bVal = new Date(b[sortField] || 0);
          break;
        case 'amount':
          aVal = calculateTotal(a.items);
          bVal = calculateTotal(b.items);
          break;
        case 'probability':
          aVal = a.probability || 0;
          bVal = b.probability || 0;
          break;
        case 'clientName':
        case 'projectName':
          aVal = a[sortField] || '';
          bVal = b[sortField] || '';
          break;
        default:
          aVal = a[sortField] || '';
          bVal = b[sortField] || '';
      }
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });

  // 編集フォームの現在のデータ
  const formData = editingEstimate || newEstimate;
  const setFormData = editingEstimate ? setEditingEstimate : setNewEstimate;

  // AI見積生成（Claude.ai Artifact内で動作）
  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) {
      alert('見積内容を入力してください');
      return;
    }
    
    setAiLoading(true);
    setAiResult(null);
    
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [
            { 
              role: "user", 
              content: `あなたはWeb制作・システム開発・コンサルティング会社の見積作成AIアシスタントです。
以下の依頼内容から、適切な見積明細を作成してください。

【依頼内容】
${aiPrompt}

【出力形式】
必ず以下のJSON形式のみで回答してください。説明文は不要です。
{
  "clientName": "クライアント名（推測または「要確認」）",
  "projectName": "案件名",
  "items": [
    {"name": "項目名", "quantity": 数量, "unitPrice": 単価（円）}
  ],
  "notes": "備考（あれば）",
  "probability": 成約確度（30-80の数値）
}

【単価の目安】
- Webサイトデザイン: 200,000〜500,000円
- コーディング: 100,000〜300,000円
- システム開発: 300,000〜1,000,000円
- コンサルティング: 100,000〜300,000円/月
- 保守運用: 30,000〜100,000円/月
- AI導入支援: 200,000〜500,000円`
            }
          ],
        })
      });

      const data = await response.json();
      const text = data.content?.map(item => item.text || "").join("") || "";
      
      // JSONを抽出してパース
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setAiResult(parsed);
      } else {
        throw new Error('JSONの解析に失敗しました');
      }
    } catch (error) {
      console.error('AI見積生成エラー:', error);
      alert('AI見積アシスタントはClaude.aiのArtifact内でのみ動作します。\n\nStackBlitz等の外部環境では、手動で見積を作成してください。');
    } finally {
      setAiLoading(false);
    }
  };

  // AI結果を新規見積に適用
  const handleApplyAiResult = () => {
    if (!aiResult) return;
    
    setNewEstimate({
      clientName: aiResult.clientName || '',
      clientContact: '',
      projectName: aiResult.projectName || '',
      items: aiResult.items || [{ name: '', quantity: 1, unitPrice: 0 }],
      validUntil: getDefaultValidUntil(),
      probability: aiResult.probability || 50,
      salesStage: 'proposal',
      notes: aiResult.notes || '',
    });
    setShowCreateModal(true);
    setAiResult(null);
    setAiPrompt('');
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { name: '', quantity: 1, unitPrice: 0 }]
    });
  };

  const handleRemoveItem = (index) => {
    if (formData.items.length > 1) {
      setFormData({
        ...formData,
        items: formData.items.filter((_, i) => i !== index)
      });
    }
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = formData.items.map((item, i) => {
      if (i === index) {
        return { ...item, [field]: field === 'quantity' || field === 'unitPrice' ? Number(value) : value };
      }
      return item;
    });
    setFormData({ ...formData, items: updatedItems });
  };

  const handleSubmit = () => {
    if (!formData.clientName || !formData.projectName) {
      alert('クライアント名と案件名は必須です');
      return;
    }
    if (formData.items.some(item => !item.name || item.unitPrice <= 0)) {
      alert('明細の品名と単価を入力してください');
      return;
    }
    
    if (editingEstimate) {
      onUpdateEstimate(editingEstimate);
      setEditingEstimate(null);
    } else {
      onCreateEstimate(newEstimate);
      setShowCreateModal(false);
      setNewEstimate({
        clientName: '',
        clientContact: '',
        projectName: '',
        items: [{ name: '', quantity: 1, unitPrice: 0 }],
        validUntil: getDefaultValidUntil(),
        probability: 50,
        salesStage: 'proposal',
        notes: '',
      });
    }
  };

  const handleEdit = (est) => {
    setEditingEstimate({ ...est, items: est.items.map(item => ({ ...item })) });
  };

  const handleCancelEdit = () => {
    setEditingEstimate(null);
    setShowCreateModal(false);
  };

  const stageOptions = [
    { value: 'proposal', label: '提案中' },
    { value: 'won', label: '成約' },
    { value: 'completed', label: '完了' },
    { value: 'lost', label: '失注' },
  ];

  return (
    <div style={styles.listContainer}>
      {/* AI見積セクション */}
      <div style={styles.aiSection}>
        <div style={styles.aiHeader}>
          <span style={styles.aiIcon}>🤖</span>
          <h3 style={styles.aiTitle}>AI見積アシスタント</h3>
          <span style={styles.aiNotice}>※ Claude.ai Artifact内でのみ動作</span>
        </div>
        <div style={styles.aiInputContainer}>
          <textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="見積内容を入力してください（例：「株式会社ABCにコーポレートサイトのリニューアル。トップページ含め10ページ、スマホ対応、CMS導入希望」）"
            style={styles.aiTextarea}
            rows={3}
          />
          <button
            onClick={handleAiGenerate}
            disabled={aiLoading || !aiPrompt.trim()}
            style={{
              ...styles.aiButton,
              opacity: aiLoading || !aiPrompt.trim() ? 0.6 : 1,
            }}
          >
            {aiLoading ? '生成中...' : '✨ AIで見積作成'}
          </button>
        </div>
        
        {/* AI結果プレビュー */}
        {aiResult && (
          <div style={styles.aiResultContainer}>
            <div style={styles.aiResultHeader}>
              <span>📋 AI生成結果</span>
              <button
                onClick={() => setAiResult(null)}
                style={styles.aiResultClose}
              >
                ✕
              </button>
            </div>
            <div style={styles.aiResultContent}>
              <div style={styles.aiResultRow}>
                <span style={styles.aiResultLabel}>クライアント:</span>
                <span>{aiResult.clientName}</span>
              </div>
              <div style={styles.aiResultRow}>
                <span style={styles.aiResultLabel}>案件名:</span>
                <span>{aiResult.projectName}</span>
              </div>
              <div style={styles.aiResultItems}>
                <span style={styles.aiResultLabel}>明細:</span>
                <table style={styles.aiResultTable}>
                  <thead>
                    <tr>
                      <th style={styles.aiResultTh}>項目</th>
                      <th style={styles.aiResultTh}>数量</th>
                      <th style={styles.aiResultTh}>単価</th>
                      <th style={styles.aiResultTh}>小計</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aiResult.items?.map((item, idx) => (
                      <tr key={idx}>
                        <td style={styles.aiResultTd}>{item.name}</td>
                        <td style={{ ...styles.aiResultTd, textAlign: 'center' }}>{item.quantity}</td>
                        <td style={{ ...styles.aiResultTd, textAlign: 'right' }}>{formatCurrency(item.unitPrice)}</td>
                        <td style={{ ...styles.aiResultTd, textAlign: 'right' }}>{formatCurrency(item.quantity * item.unitPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={3} style={{ ...styles.aiResultTd, textAlign: 'right', fontWeight: '600' }}>合計（税抜）</td>
                      <td style={{ ...styles.aiResultTd, textAlign: 'right', fontWeight: '600' }}>
                        {formatCurrency(aiResult.items?.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0) || 0)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              {aiResult.notes && (
                <div style={styles.aiResultRow}>
                  <span style={styles.aiResultLabel}>備考:</span>
                  <span>{aiResult.notes}</span>
                </div>
              )}
              <div style={styles.aiResultRow}>
                <span style={styles.aiResultLabel}>成約確度:</span>
                <span>{aiResult.probability}%</span>
              </div>
            </div>
            <div style={styles.aiResultActions}>
              <button
                onClick={handleApplyAiResult}
                style={styles.aiApplyButton}
              >
                この内容で見積を作成 →
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={styles.listHeader}>
        <h2 style={styles.listTitle}>見積一覧</h2>
        <div style={styles.listHeaderRight}>
          <div style={styles.filterGroup}>
            {[
              { value: 'all', label: 'すべて' },
              { value: 'proposal', label: '提案中' },
              { value: 'won', label: '成約' },
              { value: 'completed', label: '完了' },
            ].map(f => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                style={{
                  ...styles.filterButton,
                  ...(filter === f.value ? styles.filterButtonActive : {})
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
          <button 
            style={styles.createButton}
            onClick={() => setShowCreateModal(true)}
          >
            ＋ 新規作成
          </button>
        </div>
      </div>

      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>見積番号</th>
              <th style={{...styles.th, ...styles.sortableTh}} onClick={() => handleSort('clientName')}>
                クライアント{getSortIcon('clientName')}
              </th>
              <th style={{...styles.th, ...styles.sortableTh}} onClick={() => handleSort('projectName')}>
                案件名{getSortIcon('projectName')}
              </th>
              <th style={{...styles.th, ...styles.sortableTh}} onClick={() => handleSort('amount')}>
                金額{getSortIcon('amount')}
              </th>
              <th style={styles.th}>ステータス</th>
              <th style={{...styles.th, ...styles.sortableTh}} onClick={() => handleSort('probability')}>
                成約確度{getSortIcon('probability')}
              </th>
              <th style={{...styles.th, ...styles.sortableTh}} onClick={() => handleSort('createdAt')}>
                作成日{getSortIcon('createdAt')}
              </th>
              <th style={styles.th}>操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(est => (
              <tr key={est.id} style={styles.tr}>
                <td style={styles.td}>{est.id}</td>
                <td style={styles.td}>{est.clientName}</td>
                <td style={styles.td}>{est.projectName}</td>
                <td style={styles.tdRight}>{formatCurrency(calculateTotal(est.items))}</td>
                <td style={styles.td}>
                  <span style={{
                    ...styles.badge,
                    background: getBadgeColor(est.salesStage)
                  }}>
                    {est.status}
                  </span>
                </td>
                <td style={styles.tdCenter}>{est.probability}%</td>
                <td style={styles.td}>{formatDate(est.createdAt)}</td>
                <td style={styles.td}>
                  <div style={styles.actionButtons}>
                    <button style={styles.smallButton} onClick={() => onView(est)}>PDF</button>
                    <button 
                      style={{ ...styles.smallButton, background: '#6366f1' }}
                      onClick={() => handleEdit(est)}
                    >
                      編集
                    </button>
                    {est.salesStage === 'won' && (
                      <button 
                        style={{ ...styles.smallButton, background: '#2d8a3e' }}
                        onClick={() => onCreateInvoice(est)}
                      >
                        請求作成
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 新規作成/編集モーダル */}
      {(showCreateModal || editingEstimate) && (
        <div style={styles.modalOverlay} onClick={handleCancelEdit}>
          <div style={styles.createModalContent} onClick={e => e.stopPropagation()}>
            <button style={styles.modalClose} onClick={handleCancelEdit}>×</button>
            <h2 style={styles.createModalTitle}>
              {editingEstimate ? `📝 見積書 編集（${editingEstimate.id}）` : '📝 見積書 新規作成'}
            </h2>
            
            <div style={styles.createForm}>
              <div style={styles.createFormRow}>
                <div style={styles.createFormGroup}>
                  <label style={styles.createFormLabel}>クライアント名 *</label>
                  <input
                    type="text"
                    value={formData.clientName}
                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                    style={styles.createFormInput}
                    placeholder="株式会社サンプル"
                  />
                </div>
                <div style={styles.createFormGroup}>
                  <label style={styles.createFormLabel}>担当者名</label>
                  <input
                    type="text"
                    value={formData.clientContact}
                    onChange={(e) => setFormData({ ...formData, clientContact: e.target.value })}
                    style={styles.createFormInput}
                    placeholder="山田太郎"
                  />
                </div>
              </div>

              <div style={styles.createFormGroup}>
                <label style={styles.createFormLabel}>案件名 *</label>
                <input
                  type="text"
                  value={formData.projectName}
                  onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                  style={styles.createFormInput}
                  placeholder="Webサイトリニューアル"
                />
              </div>

              <div style={styles.createFormRow}>
                <div style={styles.createFormGroup}>
                  <label style={styles.createFormLabel}>有効期限</label>
                  <input
                    type="date"
                    value={formData.validUntil}
                    onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                    style={styles.createFormInput}
                  />
                </div>
                <div style={styles.createFormGroup}>
                  <label style={styles.createFormLabel}>ステータス</label>
                  <select
                    value={formData.salesStage}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      salesStage: e.target.value, 
                      status: stageOptions.find(s => s.value === e.target.value)?.label,
                      lostReason: e.target.value !== 'lost' ? '' : formData.lostReason,
                      lostReasonNote: e.target.value !== 'lost' ? '' : formData.lostReasonNote,
                    })}
                    style={styles.createFormSelect}
                  >
                    {stageOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div style={styles.createFormGroup}>
                  <label style={styles.createFormLabel}>成約確度</label>
                  <select
                    value={formData.probability}
                    onChange={(e) => setFormData({ ...formData, probability: Number(e.target.value) })}
                    style={styles.createFormSelect}
                  >
                    <option value={10}>10%</option>
                    <option value={20}>20%</option>
                    <option value={30}>30%</option>
                    <option value={40}>40%</option>
                    <option value={50}>50%</option>
                    <option value={60}>60%</option>
                    <option value={70}>70%</option>
                    <option value={80}>80%</option>
                    <option value={90}>90%</option>
                    <option value={100}>100%</option>
                  </select>
                </div>
              </div>

              {/* 失注理由入力（失注選択時のみ表示） */}
              {formData.salesStage === 'lost' && (
                <div style={{
                  background: 'rgba(153, 27, 27, 0.15)',
                  border: '1px solid rgba(153, 27, 27, 0.3)',
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '20px',
                }}>
                  <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#f87171', marginBottom: '16px' }}>
                    ⚠️ 失注理由
                  </h4>
                  <div style={styles.createFormGroup}>
                    <label style={styles.createFormLabel}>要因 *</label>
                    <select
                      value={formData.lostReason || ''}
                      onChange={(e) => setFormData({ ...formData, lostReason: e.target.value })}
                      style={styles.createFormSelect}
                    >
                      <option value="">-- 選択してください --</option>
                      {Object.entries(LOST_REASONS).map(([catKey, category]) => (
                        <optgroup key={catKey} label={category.label}>
                          {category.items.map(item => (
                            <option key={item.code} value={item.code}>
                              {item.code} : {item.label}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                  <div style={styles.createFormGroup}>
                    <label style={styles.createFormLabel}>備考</label>
                    <textarea
                      value={formData.lostReasonNote || ''}
                      onChange={(e) => setFormData({ ...formData, lostReasonNote: e.target.value })}
                      style={styles.createFormTextarea}
                      rows={3}
                      placeholder="失注の詳細や改善点など..."
                    />
                  </div>
                </div>
              )}

              <div style={styles.createFormGroup}>
                <label style={styles.createFormLabel}>明細</label>
                <div style={styles.itemsContainer}>
                  {formData.items.map((item, index) => (
                    <div key={index} style={styles.itemRow}>
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                        style={{ ...styles.createFormInput, flex: 2 }}
                        placeholder="品名"
                      />
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        style={{ ...styles.createFormInput, width: '80px' }}
                        placeholder="数量"
                        min="1"
                      />
                      <input
                        type="number"
                        value={item.unitPrice || ''}
                        onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                        style={{ ...styles.createFormInput, width: '140px' }}
                        placeholder="単価"
                      />
                      <span style={styles.itemAmount}>
                        {formatCurrency(item.quantity * item.unitPrice)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        style={styles.removeItemButton}
                        disabled={formData.items.length === 1}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={handleAddItem}
                    style={styles.addItemButton}
                  >
                    ＋ 明細を追加
                  </button>
                </div>
              </div>

              <div style={styles.createFormTotalRow}>
                <span>合計金額（税込）</span>
                <span style={styles.createFormTotalValue}>
                  {formatCurrency(calculateTotal(formData.items) + calculateTax(calculateTotal(formData.items)))}
                </span>
              </div>

              <div style={styles.createFormGroup}>
                <label style={styles.createFormLabel}>備考</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  style={styles.createFormTextarea}
                  placeholder="備考・メモなど"
                  rows={3}
                />
              </div>

              <div style={styles.createFormActions}>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  style={styles.cancelButton}
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  style={styles.submitButton}
                >
                  {editingEstimate ? '更新する' : '作成する'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ========================================
// 請求一覧
// ========================================
function InvoiceList({ invoices, estimates, onMarkPaid, onView, onCreateInvoice, onUpdateInvoice }) {
  const [filter, setFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null); // 編集中の請求書
  
  // ソート機能
  const [sortField, setSortField] = useState('issuedAt');
  const [sortOrder, setSortOrder] = useState('desc'); // desc = 新しい順
  
  const [newInvoice, setNewInvoice] = useState({
    clientName: '',
    items: [{ name: '', quantity: 1, unitPrice: 0 }],
    expectedPayment: '',
    notes: '',
  });

  // ソート処理
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return ' ↕';
    return sortOrder === 'asc' ? ' ↑' : ' ↓';
  };

  const filtered = invoices
    .filter(inv => {
      if (filter === 'all') return true;
      if (filter === 'unpaid') return inv.status === '未入金';
      if (filter === 'paid') return inv.status === '入金済';
      return true;
    })
    .sort((a, b) => {
      let aVal, bVal;
      switch (sortField) {
        case 'issuedAt':
        case 'expectedPayment':
        case 'paidAt':
          aVal = new Date(a[sortField] || '1900-01-01');
          bVal = new Date(b[sortField] || '1900-01-01');
          break;
        case 'total':
          aVal = a.total || 0;
          bVal = b.total || 0;
          break;
        case 'clientName':
          aVal = a[sortField] || '';
          bVal = b[sortField] || '';
          break;
        default:
          aVal = a[sortField] || '';
          bVal = b[sortField] || '';
      }
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });

  // 未請求の成約案件
  const unbilledEstimates = estimates.filter(est => {
    if (est.salesStage !== 'won') return false;
    const hasInvoice = invoices.some(inv => inv.estimateId === est.id);
    return !hasInvoice;
  });

  // 編集フォームの現在のデータ
  const formData = editingInvoice || newInvoice;
  const setFormData = editingInvoice ? setEditingInvoice : setNewInvoice;

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { name: '', quantity: 1, unitPrice: 0 }]
    });
  };

  const handleRemoveItem = (index) => {
    if (formData.items.length > 1) {
      setFormData({
        ...formData,
        items: formData.items.filter((_, i) => i !== index)
      });
    }
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = formData.items.map((item, i) => {
      if (i === index) {
        return { ...item, [field]: field === 'quantity' || field === 'unitPrice' ? Number(value) : value };
      }
      return item;
    });
    setFormData({ ...formData, items: updatedItems });
  };

  const handleSubmit = () => {
    if (!formData.clientName) {
      alert('クライアント名は必須です');
      return;
    }
    if (formData.items.some(item => !item.name || item.unitPrice <= 0)) {
      alert('明細の品名と単価を入力してください');
      return;
    }
    
    if (editingInvoice) {
      // 編集モード
      const amount = calculateTotal(editingInvoice.items);
      onUpdateInvoice({
        ...editingInvoice,
        amount: amount,
        tax: calculateTax(amount),
        total: amount + calculateTax(amount)
      });
      setEditingInvoice(null);
    } else {
      // 新規作成モード
      onCreateInvoice(newInvoice);
      setShowCreateModal(false);
      setNewInvoice({
        clientName: '',
        items: [{ name: '', quantity: 1, unitPrice: 0 }],
        expectedPayment: '',
        notes: '',
      });
    }
  };

  const handleEdit = (inv) => {
    // itemsがない場合は見積から取得するか、デフォルト作成
    const items = inv.items || [{ name: '請求金額', quantity: 1, unitPrice: inv.amount }];
    setEditingInvoice({ 
      ...inv, 
      items: items.map(item => ({ ...item }))
    });
  };

  const handleCancelEdit = () => {
    setEditingInvoice(null);
    setShowCreateModal(false);
  };

  const handleCreateFromEstimate = (est) => {
    setNewInvoice({
      clientName: est.clientName,
      items: est.items.map(item => ({ ...item })),
      expectedPayment: '',
      notes: est.projectName,
      estimateId: est.id,
    });
    setShowCreateModal(true);
  };

  return (
    <div style={styles.listContainer}>
      <div style={styles.listHeader}>
        <h2 style={styles.listTitle}>請求一覧</h2>
        <div style={styles.listHeaderRight}>
          <div style={styles.filterGroup}>
            {[
              { value: 'all', label: 'すべて' },
              { value: 'unpaid', label: '未入金' },
              { value: 'paid', label: '入金済' },
            ].map(f => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                style={{
                  ...styles.filterButton,
                  ...(filter === f.value ? styles.filterButtonActive : {})
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
          <button 
            style={styles.createButton}
            onClick={() => setShowCreateModal(true)}
          >
            ＋ 新規作成
          </button>
        </div>
      </div>

      {/* 未請求の成約案件がある場合の通知 */}
      {unbilledEstimates.length > 0 && (
        <div style={styles.unbilledNotice}>
          <span style={styles.unbilledNoticeIcon}>📋</span>
          <span>未請求の成約案件が {unbilledEstimates.length}件 あります：</span>
          <div style={styles.unbilledList}>
            {unbilledEstimates.map(est => (
              <button
                key={est.id}
                style={styles.unbilledItem}
                onClick={() => handleCreateFromEstimate(est)}
              >
                {est.clientName} - {est.projectName} ({formatCurrency(calculateTotal(est.items))})
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>請求番号</th>
              <th style={{...styles.th, ...styles.sortableTh}} onClick={() => handleSort('clientName')}>
                クライアント{getSortIcon('clientName')}
              </th>
              <th style={{...styles.th, ...styles.sortableTh}} onClick={() => handleSort('total')}>
                金額（税込）{getSortIcon('total')}
              </th>
              <th style={{...styles.th, ...styles.sortableTh}} onClick={() => handleSort('issuedAt')}>
                発行日{getSortIcon('issuedAt')}
              </th>
              <th style={{...styles.th, ...styles.sortableTh}} onClick={() => handleSort('expectedPayment')}>
                入金予定日{getSortIcon('expectedPayment')}
              </th>
              <th style={{...styles.th, ...styles.sortableTh}} onClick={() => handleSort('paidAt')}>
                入金日{getSortIcon('paidAt')}
              </th>
              <th style={styles.th}>ステータス</th>
              <th style={styles.th}>操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(inv => (
              <tr key={inv.id} style={styles.tr}>
                <td style={styles.td}>{inv.id}</td>
                <td style={styles.td}>{inv.clientName}</td>
                <td style={styles.tdRight}>{formatCurrency(inv.total)}</td>
                <td style={styles.td}>{formatDate(inv.issuedAt)}</td>
                <td style={styles.td}>{formatDate(inv.expectedPayment)}</td>
                <td style={styles.td}>{formatDate(inv.paidAt)}</td>
                <td style={styles.td}>
                  <span style={{
                    ...styles.badge,
                    background: inv.status === '入金済' ? '#2d8a3e' : '#cd853f'
                  }}>
                    {inv.status}
                  </span>
                </td>
                <td style={styles.td}>
                  <div style={styles.actionButtons}>
                    <button style={styles.smallButton} onClick={() => onView(inv)}>PDF</button>
                    <button 
                      style={{ ...styles.smallButton, background: '#6366f1' }}
                      onClick={() => handleEdit(inv)}
                    >
                      編集
                    </button>
                    {inv.status === '未入金' && (
                      <button 
                        style={{ ...styles.smallButton, background: '#2d8a3e' }}
                        onClick={() => onMarkPaid(inv)}
                      >
                        入金確認
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 新規作成/編集モーダル */}
      {(showCreateModal || editingInvoice) && (
        <div style={styles.modalOverlay} onClick={handleCancelEdit}>
          <div style={styles.createModalContent} onClick={e => e.stopPropagation()}>
            <button style={styles.modalClose} onClick={handleCancelEdit}>×</button>
            <h2 style={styles.createModalTitle}>
              {editingInvoice ? `💴 請求書 編集（${editingInvoice.id}）` : '💴 請求書 新規作成'}
            </h2>
            
            <div style={styles.createForm}>
              <div style={styles.createFormRow}>
                <div style={styles.createFormGroup}>
                  <label style={styles.createFormLabel}>クライアント名 *</label>
                  <input
                    type="text"
                    value={formData.clientName}
                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                    style={styles.createFormInput}
                    placeholder="株式会社サンプル"
                  />
                </div>
                <div style={styles.createFormGroup}>
                  <label style={styles.createFormLabel}>入金予定日</label>
                  <input
                    type="date"
                    value={formData.expectedPayment || ''}
                    onChange={(e) => setFormData({ ...formData, expectedPayment: e.target.value })}
                    style={styles.createFormInput}
                  />
                </div>
              </div>

              {editingInvoice && (
                <div style={styles.createFormRow}>
                  <div style={styles.createFormGroup}>
                    <label style={styles.createFormLabel}>ステータス</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        status: e.target.value,
                        paidAt: e.target.value === '入金済' && !formData.paidAt 
                          ? new Date().toISOString().split('T')[0] 
                          : e.target.value === '未入金' ? null : formData.paidAt
                      })}
                      style={styles.createFormSelect}
                    >
                      <option value="未入金">未入金</option>
                      <option value="入金済">入金済</option>
                    </select>
                  </div>
                  {formData.status === '入金済' && (
                    <div style={styles.createFormGroup}>
                      <label style={styles.createFormLabel}>入金日</label>
                      <input
                        type="date"
                        value={formData.paidAt || ''}
                        onChange={(e) => setFormData({ ...formData, paidAt: e.target.value })}
                        style={styles.createFormInput}
                      />
                    </div>
                  )}
                </div>
              )}

              <div style={styles.createFormGroup}>
                <label style={styles.createFormLabel}>明細</label>
                <div style={styles.itemsContainer}>
                  {formData.items.map((item, index) => (
                    <div key={index} style={styles.itemRow}>
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                        style={{ ...styles.createFormInput, flex: 2 }}
                        placeholder="品名"
                      />
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        style={{ ...styles.createFormInput, width: '80px' }}
                        placeholder="数量"
                        min="1"
                      />
                      <input
                        type="number"
                        value={item.unitPrice || ''}
                        onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                        style={{ ...styles.createFormInput, width: '140px' }}
                        placeholder="単価"
                      />
                      <span style={styles.itemAmount}>
                        {formatCurrency(item.quantity * item.unitPrice)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        style={styles.removeItemButton}
                        disabled={formData.items.length === 1}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={handleAddItem}
                    style={styles.addItemButton}
                  >
                    ＋ 明細を追加
                  </button>
                </div>
              </div>

              <div style={styles.createFormTotalRow}>
                <span>合計金額（税込）</span>
                <span style={styles.createFormTotalValue}>
                  {formatCurrency(calculateTotal(formData.items) + calculateTax(calculateTotal(formData.items)))}
                </span>
              </div>

              <div style={styles.createFormGroup}>
                <label style={styles.createFormLabel}>備考</label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  style={styles.createFormTextarea}
                  placeholder="備考・メモなど"
                  rows={3}
                />
              </div>

              <div style={styles.createFormActions}>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  style={styles.cancelButton}
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  style={styles.submitButton}
                >
                  {editingInvoice ? '更新する' : '作成する'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ========================================
// キャッシュフロー分析
// ========================================
function CashflowAnalysis({ estimates, invoices, fiscalYearEndMonth }) {
  // 会計年度の月順を生成（決算月の翌月から始まる）
  const fiscalYearStartMonth = (fiscalYearEndMonth % 12) + 1;
  
  // 表示モード: 'fiscal' = 会計年度, 'rolling' = 今月から12ヶ月
  const [viewMode, setViewMode] = useState('fiscal');
  
  // 現在の日付情報
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  
  // 会計年度の計算（例：2026年1月なら2026年5月期 = 2025年6月〜2026年5月）
  const fiscalYear = currentMonth <= fiscalYearEndMonth ? currentYear : currentYear + 1;
  const fiscalStartYear = fiscalYear - 1;
  
  // 会計年度ベースの12ヶ月リストを生成
  const getFiscalYearMonths = () => {
    const months = [];
    for (let i = 0; i < 12; i++) {
      const targetMonth = ((fiscalYearStartMonth - 1 + i) % 12) + 1;
      const targetYear = targetMonth >= fiscalYearStartMonth ? fiscalStartYear : fiscalYear;
      months.push({
        monthNum: targetMonth,
        year: targetYear,
        label: `${targetMonth}月`,
        fullLabel: `${targetYear}/${targetMonth}`,
        order: i + 1,
        isPast: (targetYear < currentYear) || (targetYear === currentYear && targetMonth < currentMonth),
        isCurrent: targetYear === currentYear && targetMonth === currentMonth
      });
    }
    return months;
  };
  
  // 今月から12ヶ月分の月リストを生成
  const getNext12Months = () => {
    const months = [];
    for (let i = 0; i < 12; i++) {
      const targetMonth = ((currentMonth - 1 + i) % 12) + 1;
      const targetYear = currentYear + Math.floor((currentMonth - 1 + i) / 12);
      months.push({
        monthNum: targetMonth,
        year: targetYear,
        label: `${targetMonth}月`,
        fullLabel: `${targetYear}/${targetMonth}`,
        order: i + 1,
        isPast: false,
        isCurrent: i === 0
      });
    }
    return months;
  };
  
  // 表示モードに応じた月リスト
  const displayMonths = viewMode === 'fiscal' ? getFiscalYearMonths() : getNext12Months();

  // 月別キャッシュフロー計算
  const monthlyData = useMemo(() => {
    return displayMonths.map((monthInfo) => {
      const monthNum = monthInfo.monthNum;
      const year = monthInfo.year;

      // 入金予定（未入金の請求書で、該当年月が入金予定日のもの）
      const expectedIncome = invoices
        .filter(inv => {
          if (inv.status !== '未入金') return false;
          const expDate = new Date(inv.expectedPayment);
          return expDate.getFullYear() === year && expDate.getMonth() + 1 === monthNum;
        })
        .reduce((sum, inv) => sum + inv.total, 0);
      
      // 入金実績（該当年月に入金済みのもの）
      const actualIncome = invoices
        .filter(inv => {
          if (!inv.paidAt) return false;
          const paidDate = new Date(inv.paidAt);
          return paidDate.getFullYear() === year && paidDate.getMonth() + 1 === monthNum;
        })
        .reduce((sum, inv) => sum + inv.total, 0);

      return {
        ...monthInfo,
        expected: expectedIncome,
        actual: actualIncome,
        total: expectedIncome + actualIncome
      };
    });
  }, [invoices, displayMonths]);

  // グラフの最大値
  const maxValue = Math.max(
    ...monthlyData.map(d => d.total),
    1000000
  );

  // 入金予定一覧（未入金の請求書のみ）
  const upcomingPayments = invoices
    .filter(i => i.status === '未入金')
    .map(i => ({
      type: '請求済',
      client: i.clientName,
      amount: i.total,
      date: i.expectedPayment,
    }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  // 今月の入金予定額（常に今月ベース）
  const thisMonthExpected = invoices
    .filter(inv => {
      if (inv.status !== '未入金') return false;
      const expDate = new Date(inv.expectedPayment);
      return expDate.getFullYear() === currentYear && expDate.getMonth() + 1 === currentMonth;
    })
    .reduce((sum, inv) => sum + inv.total, 0);

  // 今月の入金実績
  const thisMonthActual = invoices
    .filter(inv => {
      if (!inv.paidAt) return false;
      const paidDate = new Date(inv.paidAt);
      return paidDate.getFullYear() === currentYear && paidDate.getMonth() + 1 === currentMonth;
    })
    .reduce((sum, inv) => sum + inv.total, 0);

  // 会計年度の合計
  const fiscalYearTotals = useMemo(() => {
    if (viewMode !== 'fiscal') return null;
    const totalExpected = monthlyData.reduce((s, d) => s + d.expected, 0);
    const totalActual = monthlyData.reduce((s, d) => s + d.actual, 0);
    return { expected: totalExpected, actual: totalActual, total: totalExpected + totalActual };
  }, [monthlyData, viewMode]);

  return (
    <div style={styles.cashflowContainer}>
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>📈 キャッシュフロー分析</h2>
        <div style={styles.fiscalYearBadge}>
          {fiscalYear}年{fiscalYearEndMonth}月期（{fiscalYearStartMonth}月〜{fiscalYearEndMonth}月）
        </div>
      </div>

      {/* 表示モード切り替えタブ */}
      <div style={styles.viewModeTabs}>
        <button
          style={{
            ...styles.viewModeTab,
            ...(viewMode === 'fiscal' ? styles.viewModeTabActive : {})
          }}
          onClick={() => setViewMode('fiscal')}
        >
          📅 会計年度（{fiscalStartYear}/{fiscalYearStartMonth}〜{fiscalYear}/{fiscalYearEndMonth}）
        </button>
        <button
          style={{
            ...styles.viewModeTab,
            ...(viewMode === 'rolling' ? styles.viewModeTabActive : {})
          }}
          onClick={() => setViewMode('rolling')}
        >
          📆 今月から12ヶ月
        </button>
      </div>

      {/* サマリーカード */}
      <div style={styles.cashflowSummary}>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>今月（{currentMonth}月）実績</div>
          <div style={styles.summaryValue}>{formatCurrency(thisMonthActual)}</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>今月（{currentMonth}月）予定</div>
          <div style={styles.summaryValue}>{formatCurrency(thisMonthExpected)}</div>
        </div>
        {viewMode === 'fiscal' && fiscalYearTotals && (
          <div style={styles.summaryCard}>
            <div style={styles.summaryLabel}>年間合計（実績+予定）</div>
            <div style={styles.summaryValue}>{formatCurrency(fiscalYearTotals.total)}</div>
          </div>
        )}
        {viewMode === 'rolling' && (
          <div style={styles.summaryCard}>
            <div style={styles.summaryLabel}>12ヶ月予定合計</div>
            <div style={styles.summaryValue}>
              {formatCurrency(monthlyData.reduce((s, d) => s + d.expected, 0))}
            </div>
          </div>
        )}
      </div>

      {/* グラフ */}
      <div style={styles.chartCard}>
        <h3 style={styles.chartTitle}>
          {viewMode === 'fiscal' 
            ? `月別入金状況（${fiscalStartYear}年${fiscalYearStartMonth}月〜${fiscalYear}年${fiscalYearEndMonth}月）`
            : `月別入金予定（${currentYear}年${currentMonth}月から12ヶ月）`
          }
        </h3>
        <div style={styles.chart}>
          <div style={styles.chartYAxis}>
            <span>{formatCurrency(maxValue)}</span>
            <span>{formatCurrency(maxValue / 2)}</span>
            <span>¥0</span>
          </div>
          <div style={styles.chartBars}>
            {monthlyData.map((data, idx) => (
              <div key={idx} style={styles.chartBarGroup}>
                {/* 棒グラフ上の金額表示 */}
                <div style={styles.chartBarValue}>
                  {data.total > 0 ? `${Math.round(data.total / 10000)}万` : ''}
                </div>
                <div style={styles.chartBarContainer}>
                  {/* 入金実績（緑） */}
                  {data.actual > 0 && (
                    <div 
                      style={{
                        ...styles.chartBar,
                        height: `${(data.actual / maxValue) * 100}%`,
                        background: '#2d8a3e'
                      }}
                      title={`${data.fullLabel} 実績: ${formatCurrency(data.actual)}`}
                    />
                  )}
                  {/* 入金予定（青） */}
                  {data.expected > 0 && (
                    <div 
                      style={{
                        ...styles.chartBar,
                        height: `${(data.expected / maxValue) * 100}%`,
                        background: data.isCurrent ? '#60a5fa' : '#2d7ab8'
                      }}
                      title={`${data.fullLabel} 予定: ${formatCurrency(data.expected)}`}
                    />
                  )}
                </div>
                <span style={{
                  ...styles.chartLabel,
                  fontWeight: data.isCurrent ? '700' : '400',
                  color: data.isCurrent ? '#60a5fa' : data.isPast ? '#64748b' : '#94a3b8'
                }}>
                  {data.label}
                  {data.isCurrent && <span style={{ fontSize: '10px', display: 'block' }}>今月</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div style={styles.chartLegend}>
          <span><span style={{ ...styles.legendDot, background: '#2d8a3e' }} /> 入金実績</span>
          <span><span style={{ ...styles.legendDot, background: '#2d7ab8' }} /> 入金予定</span>
        </div>
      </div>

      {/* 入金予定一覧 */}
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>入金予定一覧（未入金請求書）</h3>
        {upcomingPayments.length === 0 ? (
          <p style={styles.emptyText}>未入金の請求書はありません</p>
        ) : (
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>クライアント</th>
                  <th style={styles.th}>金額</th>
                  <th style={styles.th}>支払期限</th>
                </tr>
              </thead>
              <tbody>
                {upcomingPayments.map((payment, idx) => (
                  <tr key={idx} style={styles.tr}>
                    <td style={styles.td}>{payment.client}</td>
                    <td style={styles.tdRight}>{formatCurrency(payment.amount)}</td>
                    <td style={styles.td}>{formatDate(payment.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ========================================
// 営業パイプライン
// ========================================
function SalesPipeline({ estimates, leads, onUpdateStage, onCreateLead, onUpdateLead, onConvertToEstimate, fiscalYearEndMonth }) {
  // タブ切り替え: パイプライン / リード管理
  const [activeSubTab, setActiveSubTab] = useState('pipeline');
  
  // 会計年度の月順を生成
  const fiscalYearStartMonth = (fiscalYearEndMonth % 12) + 1;
  
  // リード管理用state
  const [leadFilter, setLeadFilter] = useState('active');
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [newLead, setNewLead] = useState({
    companyName: '',
    contactName: '',
    email: '',
    tel: '',
    source: 'Web問い合わせ',
    status: 'new',
    statusLabel: '新規',
    projectName: '',
    expectedAmount: 0,
    nextAction: '',
    nextActionDate: '',
    notes: '',
  });

  const leadStatusOptions = [
    { id: 'new', label: '新規', color: '#6b7280' },
    { id: 'contact', label: '接触中', color: '#2d7ab8' },
    { id: 'meeting', label: '商談中', color: '#cd853f' },
    { id: 'proposal', label: '提案準備', color: '#8b5cf6' },
    { id: 'converted', label: '見積化', color: '#2d8a3e' },
    { id: 'lost', label: '失注', color: '#991b1b' },
  ];

  const sourceOptions = ['Web問い合わせ', '紹介', '展示会', 'セミナー', 'テレアポ', 'SNS', 'その他'];

  // 月次予算設定
  const getInitialBudgets = () => {
    const budgets = {};
    for (let i = 0; i < 12; i++) {
      const month = ((fiscalYearStartMonth - 1 + i) % 12) + 1;
      const defaultBudgets = {
        1: 3000000, 2: 3500000, 3: 4000000, 4: 3500000,
        5: 4000000, 6: 5000000, 7: 3000000, 8: 3000000,
        9: 4000000, 10: 4500000, 11: 4000000, 12: 5000000
      };
      budgets[month] = defaultBudgets[month];
    }
    return budgets;
  };

  const [monthlyBudgets, setMonthlyBudgets] = useState(getInitialBudgets);
  const [editingBudget, setEditingBudget] = useState(null);
  const [budgetInput, setBudgetInput] = useState('');

  // 現在の日付情報
  const currentDate = new Date();
  const currentCalendarMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();
  const fiscalYear = currentCalendarMonth <= fiscalYearEndMonth ? currentYear : currentYear + 1;
  const fiscalStartYear = fiscalYear - 1;

  // 月別データ計算
  const monthlyData = useMemo(() => {
    const months = [];
    
    for (let i = 0; i < 12; i++) {
      const month = ((fiscalYearStartMonth - 1 + i) % 12) + 1;
      const year = month >= fiscalYearStartMonth ? fiscalStartYear : fiscalYear;
      
      // 新規リード数
      const newLeads = leads ? leads.filter(l => {
        const createdDate = new Date(l.createdAt);
        return createdDate.getFullYear() === year && createdDate.getMonth() + 1 === month;
      }).length : 0;
      
      // 見積化数
      const convertedLeads = leads ? leads.filter(l => {
        if (l.status !== 'converted') return false;
        const updatedDate = new Date(l.updatedAt);
        return updatedDate.getFullYear() === year && updatedDate.getMonth() + 1 === month;
      }).length : 0;
      
      // 成約数・金額
      const wonDeals = estimates.filter(e => {
        if (!['won', 'completed'].includes(e.salesStage)) return false;
        const createdDate = new Date(e.createdAt);
        return createdDate.getFullYear() === year && createdDate.getMonth() + 1 === month;
      }).length;
      
      const wonAmount = estimates
        .filter(e => {
          if (!['won', 'completed'].includes(e.salesStage)) return false;
          const createdDate = new Date(e.createdAt);
          return createdDate.getFullYear() === year && createdDate.getMonth() + 1 === month;
        })
        .reduce((sum, e) => sum + calculateTotal(e.items), 0);

      // パイプライン（期待値）
      const pipeline = estimates
        .filter(e => {
          if (['won', 'completed', 'lost'].includes(e.salesStage)) return false;
          const createdDate = new Date(e.createdAt);
          return createdDate.getFullYear() === year && createdDate.getMonth() + 1 === month;
        })
        .reduce((sum, e) => sum + (calculateTotal(e.items) * e.probability / 100), 0);

      const budget = monthlyBudgets[month] || 0;
      const achievementRate = budget > 0 ? Math.round((wonAmount / budget) * 100) : 0;
      const forecastRate = budget > 0 ? Math.round(((wonAmount + pipeline) / budget) * 100) : 0;

      months.push({
        month, year, monthName: `${month}月`, fiscalOrder: i + 1,
        newLeads, convertedLeads, wonDeals, wonAmount, pipeline, budget,
        achievementRate, forecastRate,
        isCurrent: year === currentYear && month === currentCalendarMonth,
        isPast: (year < currentYear) || (year === currentYear && month < currentCalendarMonth)
      });
    }
    return months;
  }, [estimates, leads, monthlyBudgets, fiscalYearStartMonth, fiscalStartYear, fiscalYear, currentCalendarMonth, currentYear]);

  // KPI集計
  const kpiSummary = useMemo(() => {
    const activeLeads = leads ? leads.filter(l => !['converted', 'lost'].includes(l.status)).length : 0;
    const totalLeads = leads ? leads.length : 0;
    const convertedCount = leads ? leads.filter(l => l.status === 'converted').length : 0;
    const conversionRate = totalLeads > 0 ? Math.round((convertedCount / totalLeads) * 100) : 0;
    
    const totalDeals = estimates.filter(e => ['won', 'lost', 'completed'].includes(e.salesStage)).length;
    const wonDeals = estimates.filter(e => ['won', 'completed'].includes(e.salesStage)).length;
    const winRate = totalDeals > 0 ? Math.round((wonDeals / totalDeals) * 100) : 0;
    
    const yearWonAmount = monthlyData.reduce((s, m) => s + m.wonAmount, 0);
    const yearPipeline = monthlyData.reduce((s, m) => s + m.pipeline, 0);
    const yearBudget = Object.values(monthlyBudgets).reduce((s, v) => s + v, 0);
    const yearAchievementRate = yearBudget > 0 ? Math.round((yearWonAmount / yearBudget) * 100) : 0;
    const avgDealSize = wonDeals > 0 ? Math.round(yearWonAmount / wonDeals) : 0;
    
    return { activeLeads, totalLeads, convertedCount, conversionRate, winRate, yearWonAmount, yearPipeline, yearBudget, yearAchievementRate, avgDealSize, wonDeals };
  }, [leads, estimates, monthlyData, monthlyBudgets]);

  // クライアント別売上TOP5
  const topClients = useMemo(() => {
    const clientTotals = {};
    estimates.filter(e => ['won', 'completed'].includes(e.salesStage)).forEach(e => {
      if (!clientTotals[e.clientName]) clientTotals[e.clientName] = 0;
      clientTotals[e.clientName] += calculateTotal(e.items);
    });
    return Object.entries(clientTotals).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [estimates]);

  // 予算編集
  const handleBudgetEdit = (month) => {
    setEditingBudget(month);
    setBudgetInput(String(monthlyBudgets[month]));
  };

  const handleBudgetSave = (month) => {
    const value = parseInt(budgetInput.replace(/,/g, ''), 10);
    if (!isNaN(value) && value >= 0) {
      setMonthlyBudgets({ ...monthlyBudgets, [month]: value });
    }
    setEditingBudget(null);
    setBudgetInput('');
  };

  // リード管理
  const filteredLeads = leads ? leads.filter(lead => {
    if (leadFilter === 'all') return lead.status !== 'converted';
    if (leadFilter === 'active') return !['converted', 'lost'].includes(lead.status);
    return lead.status === leadFilter;
  }) : [];

  const leadFormData = editingLead || newLead;
  const setLeadFormData = editingLead ? setEditingLead : setNewLead;

  const handleLeadSubmit = () => {
    if (!leadFormData.companyName || !leadFormData.contactName) {
      alert('会社名と担当者名は必須です');
      return;
    }
    const statusLabel = leadStatusOptions.find(s => s.id === leadFormData.status)?.label || '新規';
    if (editingLead) {
      onUpdateLead({ ...editingLead, statusLabel });
      setEditingLead(null);
    } else {
      onCreateLead({ ...newLead, statusLabel });
      setShowLeadModal(false);
      setNewLead({
        companyName: '', contactName: '', email: '', tel: '',
        source: 'Web問い合わせ', status: 'new', statusLabel: '新規',
        projectName: '', expectedAmount: 0, nextAction: '', nextActionDate: '', notes: '',
      });
    }
  };

  const getLeadStatusColor = (status) => leadStatusOptions.find(s => s.id === status)?.color || '#6b7280';

  // グラフ用最大値
  const maxLeadCount = Math.max(...monthlyData.map(d => d.newLeads), 1);
  const maxWonAmount = Math.max(...monthlyData.map(d => d.wonAmount), 1000000);
  const maxBudget = Math.max(...monthlyData.map(d => d.budget), 1);
  const maxClientValue = topClients[0]?.[1] || 1;

  return (
    <div style={styles.pipelineContainer}>
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>🎯 営業管理</h2>
        <div style={styles.fiscalYearBadge}>
          {fiscalYear}年{fiscalYearEndMonth}月期（{fiscalYearStartMonth}月〜{fiscalYearEndMonth}月）
        </div>
      </div>

      {/* サブタブ */}
      <div style={styles.viewModeTabs}>
        <button
          style={{ ...styles.viewModeTab, ...(activeSubTab === 'pipeline' ? styles.viewModeTabActive : {}) }}
          onClick={() => setActiveSubTab('pipeline')}
        >
          📊 パイプライン分析
        </button>
        <button
          style={{ ...styles.viewModeTab, ...(activeSubTab === 'leads' ? styles.viewModeTabActive : {}) }}
          onClick={() => setActiveSubTab('leads')}
        >
          👥 リード管理
        </button>
      </div>

      {/* 共通KPI */}
      <div style={styles.pipelineKpi}>
        <div style={styles.pipelineKpiCard}>
          <div style={styles.pipelineKpiLabel}>年間予算</div>
          <div style={styles.pipelineKpiValue}>{formatCurrency(kpiSummary.yearBudget)}</div>
        </div>
        <div style={styles.pipelineKpiCard}>
          <div style={styles.pipelineKpiLabel}>年間実績</div>
          <div style={styles.pipelineKpiValue}>{formatCurrency(kpiSummary.yearWonAmount)}</div>
          <div style={{ fontSize: '12px', color: kpiSummary.yearAchievementRate >= 100 ? '#4ade80' : kpiSummary.yearAchievementRate >= 80 ? '#fbbf24' : '#f87171' }}>
            達成率 {kpiSummary.yearAchievementRate}%
          </div>
        </div>
        <div style={styles.pipelineKpiCard}>
          <div style={styles.pipelineKpiLabel}>パイプライン期待値</div>
          <div style={styles.pipelineKpiValue}>{formatCurrency(kpiSummary.yearPipeline)}</div>
        </div>
        <div style={styles.pipelineKpiCard}>
          <div style={styles.pipelineKpiLabel}>平均単価</div>
          <div style={styles.pipelineKpiValue}>{formatCurrency(kpiSummary.avgDealSize)}</div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>成約 {kpiSummary.wonDeals}件</div>
        </div>
      </div>

      {activeSubTab === 'pipeline' && (
        <>
          {/* 月次成約金額グラフ（上部に移動） */}
          <div style={styles.chartCard}>
            <h3 style={styles.chartTitle}>💰 月次成約金額</h3>
            <div style={styles.chart}>
              <div style={styles.chartYAxis}>
                <span>{formatCurrency(maxWonAmount)}</span>
                <span>{formatCurrency(maxWonAmount / 2)}</span>
                <span>¥0</span>
              </div>
              <div style={styles.chartBars}>
                {monthlyData.map((data, idx) => (
                  <div key={idx} style={styles.chartBarGroup}>
                    <div style={styles.chartBarValue}>
                      {data.wonAmount > 0 ? `${Math.round(data.wonAmount / 10000)}万` : ''}
                    </div>
                    <div style={styles.chartBarContainer}>
                      <div 
                        style={{
                          ...styles.chartBar,
                          height: `${(data.wonAmount / maxWonAmount) * 100}%`,
                          background: data.achievementRate >= 100 ? '#22c55e' : 
                                      data.achievementRate >= 80 ? '#eab308' : 
                                      data.isCurrent ? '#60a5fa' : '#3b82f6'
                        }}
                        title={`${data.year}/${data.month} 成約: ${formatCurrency(data.wonAmount)}`}
                      />
                    </div>
                    <span style={{
                      ...styles.chartLabel,
                      fontWeight: data.isCurrent ? '700' : '400',
                      color: data.isCurrent ? '#60a5fa' : data.isPast ? '#64748b' : '#94a3b8'
                    }}>
                      {data.monthName}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div style={styles.chartLegend}>
              <span><span style={{ ...styles.legendDot, background: '#22c55e' }} /> 達成100%以上</span>
              <span><span style={{ ...styles.legendDot, background: '#eab308' }} /> 達成80%以上</span>
              <span><span style={{ ...styles.legendDot, background: '#3b82f6' }} /> 成約金額</span>
            </div>
          </div>

          {/* 月次予算・進捗テーブル */}
          <div style={styles.budgetSection}>
            <h3 style={styles.chartTitle}>📊 月次予算・進捗管理</h3>
            <div style={styles.budgetTableContainer}>
              <table style={styles.budgetTable}>
                <thead>
                  <tr>
                    <th style={styles.budgetTh}>月</th>
                    <th style={styles.budgetTh}>予算目標</th>
                    <th style={styles.budgetTh}>実績</th>
                    <th style={styles.budgetTh}>達成率</th>
                    <th style={styles.budgetTh}>パイプライン</th>
                    <th style={styles.budgetTh}>予測達成率</th>
                    <th style={styles.budgetTh}>進捗バー</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyData.map((m) => (
                    <tr key={m.month} style={{ ...styles.budgetTr, background: m.isCurrent ? 'rgba(96, 165, 250, 0.1)' : 'transparent' }}>
                      <td style={{ ...styles.budgetTd, fontWeight: m.isCurrent ? '700' : '400' }}>
                        {m.monthName}
                        {m.isCurrent && <span style={styles.currentBadge}>今月</span>}
                      </td>
                      <td style={styles.budgetTd}>
                        {editingBudget === m.month ? (
                          <div style={styles.budgetEditContainer}>
                            <input type="text" value={budgetInput} onChange={(e) => setBudgetInput(e.target.value)}
                              style={styles.budgetInput}
                              onKeyDown={(e) => { if (e.key === 'Enter') handleBudgetSave(m.month); if (e.key === 'Escape') setEditingBudget(null); }}
                              autoFocus
                            />
                            <button style={styles.budgetSaveBtn} onClick={() => handleBudgetSave(m.month)}>✓</button>
                          </div>
                        ) : (
                          <div style={styles.budgetClickable} onClick={() => handleBudgetEdit(m.month)} title="クリックして編集">
                            {formatCurrency(m.budget)}
                            <span style={styles.editIcon}>✎</span>
                          </div>
                        )}
                      </td>
                      <td style={{ ...styles.budgetTd, textAlign: 'right' }}>{formatCurrency(m.wonAmount)}</td>
                      <td style={{ ...styles.budgetTd, textAlign: 'center', color: m.achievementRate >= 100 ? '#4ade80' : m.achievementRate >= 80 ? '#fbbf24' : '#f87171' }}>
                        {m.achievementRate}%
                      </td>
                      <td style={{ ...styles.budgetTd, textAlign: 'right', color: '#60a5fa' }}>{formatCurrency(m.pipeline)}</td>
                      <td style={{ ...styles.budgetTd, textAlign: 'center', color: m.forecastRate >= 100 ? '#4ade80' : m.forecastRate >= 80 ? '#fbbf24' : '#94a3b8' }}>
                        {m.forecastRate}%
                      </td>
                      <td style={styles.budgetTd}>
                        <div style={styles.progressBarContainer}>
                          <div style={{ ...styles.progressBarFill, width: `${Math.min(m.achievementRate, 100)}%`, background: m.achievementRate >= 100 ? '#22c55e' : m.achievementRate >= 80 ? '#eab308' : '#ef4444' }} />
                          {m.pipeline > 0 && <div style={{ ...styles.progressBarPipeline, left: `${Math.min(m.achievementRate, 100)}%`, width: `${Math.min((m.pipeline / m.budget) * 100, 100 - Math.min(m.achievementRate, 100))}%` }} />}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 営業分析グリッド */}
          <div style={styles.salesAnalytics}>
            <h3 style={styles.chartTitle}>📈 営業分析</h3>
            <div style={styles.analyticsGrid}>
              {/* ステージ別案件数（失注・完了追加） */}
              <div style={styles.analyticsCard}>
                <h4 style={styles.analyticsCardTitle}>ステージ別案件数</h4>
                <div style={styles.stageChart}>
                  {[
                    { id: 'proposal', label: '提案中', color: '#2d7ab8' },
                    { id: 'won', label: '成約', color: '#2d8a3e' },
                    { id: 'completed', label: '完了', color: '#1a5f2a' },
                    { id: 'lost', label: '失注', color: '#991b1b' },
                  ].map(stage => {
                    const count = estimates.filter(e => e.salesStage === stage.id).length;
                    const maxCount = Math.max(
                      estimates.filter(e => e.salesStage === 'proposal').length,
                      estimates.filter(e => e.salesStage === 'won').length,
                      estimates.filter(e => e.salesStage === 'completed').length,
                      estimates.filter(e => e.salesStage === 'lost').length,
                      1
                    );
                    return (
                      <div key={stage.id} style={styles.stageChartRow}>
                        <span style={styles.stageChartLabel}>{stage.label}</span>
                        <div style={styles.stageChartBarContainer}>
                          <div style={{ ...styles.stageChartBar, width: `${(count / maxCount) * 100}%`, background: stage.color }} />
                        </div>
                        <span style={styles.stageChartValue}>{count}件</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 成約指標 */}
              <div style={styles.analyticsCard}>
                <h4 style={styles.analyticsCardTitle}>成約指標</h4>
                <div style={styles.metricsGrid}>
                  <div style={styles.metricItem}>
                    <div style={styles.metricValue}>{kpiSummary.winRate}%</div>
                    <div style={styles.metricLabel}>成約率</div>
                  </div>
                  <div style={styles.metricItem}>
                    <div style={styles.metricValue}>{estimates.filter(e => e.salesStage === 'lost').length}</div>
                    <div style={styles.metricLabel}>失注件数</div>
                  </div>
                  <div style={styles.metricItem}>
                    <div style={styles.metricValue}>{kpiSummary.conversionRate}%</div>
                    <div style={styles.metricLabel}>見積化率</div>
                  </div>
                  <div style={styles.metricItem}>
                    <div style={styles.metricValue}>{estimates.filter(e => e.salesStage === 'completed').length}</div>
                    <div style={styles.metricLabel}>完了件数</div>
                  </div>
                </div>
              </div>

              {/* クライアント別売上TOP5 */}
              <div style={styles.analyticsCard}>
                <h4 style={styles.analyticsCardTitle}>クライアント別売上 TOP5</h4>
                <div style={styles.topClientsList}>
                  {topClients.map(([name, value], idx) => (
                    <div key={name} style={styles.topClientRow}>
                      <span style={styles.topClientRank}>{idx + 1}</span>
                      <span style={styles.topClientName}>{name}</span>
                      <div style={styles.topClientBarContainer}>
                        <div style={{ ...styles.topClientBar, width: `${(value / maxClientValue) * 100}%` }} />
                      </div>
                      <span style={styles.topClientValue}>{formatCurrency(value)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 案件金額分布 */}
              <div style={styles.analyticsCard}>
                <h4 style={styles.analyticsCardTitle}>案件金額分布</h4>
                <div style={styles.distributionChart}>
                  {[
                    { label: '〜50万', min: 0, max: 500000 },
                    { label: '50〜100万', min: 500000, max: 1000000 },
                    { label: '100〜200万', min: 1000000, max: 2000000 },
                    { label: '200万〜', min: 2000000, max: Infinity },
                  ].map(range => {
                    const count = estimates.filter(e => {
                      const total = calculateTotal(e.items);
                      return total >= range.min && total < range.max;
                    }).length;
                    const maxRange = Math.max(...[
                      estimates.filter(e => calculateTotal(e.items) < 500000).length,
                      estimates.filter(e => calculateTotal(e.items) >= 500000 && calculateTotal(e.items) < 1000000).length,
                      estimates.filter(e => calculateTotal(e.items) >= 1000000 && calculateTotal(e.items) < 2000000).length,
                      estimates.filter(e => calculateTotal(e.items) >= 2000000).length,
                    ], 1);
                    return (
                      <div key={range.label} style={styles.distributionRow}>
                        <span style={styles.distributionLabel}>{range.label}</span>
                        <div style={styles.distributionBarContainer}>
                          <div style={{ ...styles.distributionBar, width: `${(count / maxRange) * 100}%` }} />
                        </div>
                        <span style={styles.distributionValue}>{count}件</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* 失注分析 */}
          {estimates.filter(e => e.salesStage === 'lost' && e.lostReason).length > 0 && (
            <div style={styles.budgetSection}>
              <h3 style={styles.chartTitle}>📊 失注分析</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                {/* 失注要因別件数 */}
                <div style={styles.analyticsCard}>
                  <h4 style={styles.analyticsCardTitle}>失注要因別件数</h4>
                  <div style={styles.stageChart}>
                    {(() => {
                      // カテゴリ別に集計
                      const categoryCounts = {};
                      estimates.filter(e => e.salesStage === 'lost' && e.lostReason).forEach(e => {
                        const catKey = e.lostReason.charAt(0);
                        const catLabel = LOST_REASONS[catKey]?.label || 'その他';
                        categoryCounts[catLabel] = (categoryCounts[catLabel] || 0) + 1;
                      });
                      const maxCount = Math.max(...Object.values(categoryCounts), 1);
                      const colors = { 'A': '#ef4444', 'B': '#f59e0b', 'C': '#3b82f6', 'D': '#8b5cf6', 'E': '#6b7280' };
                      
                      return Object.entries(categoryCounts)
                        .sort((a, b) => b[1] - a[1])
                        .map(([label, count]) => (
                          <div key={label} style={styles.stageChartRow}>
                            <span style={{ ...styles.stageChartLabel, width: '160px' }}>{label}</span>
                            <div style={styles.stageChartBarContainer}>
                              <div style={{ 
                                ...styles.stageChartBar, 
                                width: `${(count / maxCount) * 100}%`, 
                                background: colors[label.charAt(0)] || '#6b7280' 
                              }} />
                            </div>
                            <span style={styles.stageChartValue}>{count}件</span>
                          </div>
                        ));
                    })()}
                  </div>
                </div>

                {/* 失注詳細一覧 */}
                <div style={styles.analyticsCard}>
                  <h4 style={styles.analyticsCardTitle}>最近の失注案件</h4>
                  <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                    {estimates
                      .filter(e => e.salesStage === 'lost' && e.lostReason)
                      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                      .slice(0, 5)
                      .map(est => {
                        const reasonItem = Object.values(LOST_REASONS)
                          .flatMap(cat => cat.items)
                          .find(item => item.code === est.lostReason);
                        return (
                          <div key={est.id} style={{
                            padding: '12px',
                            borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                              <span style={{ fontWeight: '600', color: '#e2e8f0' }}>{est.clientName}</span>
                              <span style={{ color: '#64748b', fontSize: '12px' }}>{formatDate(est.createdAt)}</span>
                            </div>
                            <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>{est.projectName}</div>
                            <div style={{ 
                              display: 'inline-block',
                              padding: '2px 8px', 
                              background: 'rgba(239, 68, 68, 0.2)', 
                              borderRadius: '4px',
                              fontSize: '11px',
                              color: '#f87171',
                            }}>
                              {est.lostReason}: {reasonItem?.label || '不明'}
                            </div>
                            {est.lostReasonNote && (
                              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                                📝 {est.lostReasonNote}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 提案中案件一覧 */}
          <div style={styles.budgetSection}>
            <h3 style={styles.chartTitle}>📋 提案中案件一覧</h3>
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>見積番号</th>
                    <th style={styles.th}>クライアント</th>
                    <th style={styles.th}>案件名</th>
                    <th style={styles.th}>金額</th>
                    <th style={styles.th}>成約確度</th>
                    <th style={styles.th}>期待値</th>
                    <th style={styles.th}>作成日</th>
                  </tr>
                </thead>
                <tbody>
                  {estimates
                    .filter(e => e.salesStage === 'proposal')
                    .sort((a, b) => calculateTotal(b.items) - calculateTotal(a.items))
                    .map(est => {
                      const total = calculateTotal(est.items);
                      const expected = Math.round(total * est.probability / 100);
                      return (
                        <tr key={est.id} style={styles.tr}>
                          <td style={styles.td}>{est.id}</td>
                          <td style={styles.td}>{est.clientName}</td>
                          <td style={styles.td}>{est.projectName}</td>
                          <td style={styles.tdRight}>{formatCurrency(total)}</td>
                          <td style={styles.tdCenter}>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '10px',
                              fontSize: '12px',
                              fontWeight: '600',
                              background: est.probability >= 70 ? 'rgba(34, 197, 94, 0.2)' : 
                                          est.probability >= 50 ? 'rgba(234, 179, 8, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                              color: est.probability >= 70 ? '#4ade80' : 
                                     est.probability >= 50 ? '#fbbf24' : '#f87171'
                            }}>
                              {est.probability}%
                            </span>
                          </td>
                          <td style={{ ...styles.tdRight, color: '#60a5fa' }}>{formatCurrency(expected)}</td>
                          <td style={styles.td}>{formatDate(est.createdAt)}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
              {estimates.filter(e => e.salesStage === 'proposal').length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  提案中の案件はありません
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {activeSubTab === 'leads' && (
        <>
          {/* リード月別グラフ */}
          <div style={styles.chartCard}>
            <h3 style={styles.chartTitle}>📈 月別リード推移</h3>
            <div style={styles.chart}>
              <div style={styles.chartYAxis}>
                <span>{maxLeadCount}件</span>
                <span>{Math.round(maxLeadCount / 2)}件</span>
                <span>0</span>
              </div>
              <div style={styles.chartBars}>
                {monthlyData.map((data, idx) => (
                  <div key={idx} style={styles.chartBarGroup}>
                    <div style={styles.chartBarValue}>
                      {data.newLeads > 0 ? data.newLeads : ''}
                    </div>
                    <div style={styles.chartBarContainer}>
                      <div 
                        style={{
                          ...styles.chartBar,
                          height: `${(data.newLeads / maxLeadCount) * 100}%`,
                          background: data.isCurrent ? '#a78bfa' : '#8b5cf6'
                        }}
                        title={`${data.year}/${data.month} 新規リード: ${data.newLeads}件`}
                      />
                    </div>
                    <span style={{
                      ...styles.chartLabel,
                      fontWeight: data.isCurrent ? '700' : '400',
                      color: data.isCurrent ? '#a78bfa' : data.isPast ? '#64748b' : '#94a3b8'
                    }}>
                      {data.monthName}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div style={styles.chartLegend}>
              <span><span style={{ ...styles.legendDot, background: '#8b5cf6' }} /> 新規リード数</span>
              <span><span style={{ ...styles.legendDot, background: '#a78bfa' }} /> 今月</span>
            </div>
          </div>

          {/* リードKPI */}
          <div style={{ ...styles.pipelineKpi, marginBottom: '20px' }}>
            <div style={styles.pipelineKpiCard}>
              <div style={styles.pipelineKpiLabel}>アクティブリード</div>
              <div style={styles.pipelineKpiValue}>{kpiSummary.activeLeads}件</div>
            </div>
            <div style={styles.pipelineKpiCard}>
              <div style={styles.pipelineKpiLabel}>見積化数</div>
              <div style={styles.pipelineKpiValue}>{kpiSummary.convertedCount}件</div>
            </div>
            <div style={styles.pipelineKpiCard}>
              <div style={styles.pipelineKpiLabel}>見積化率</div>
              <div style={styles.pipelineKpiValue}>{kpiSummary.conversionRate}%</div>
            </div>
            <div style={styles.pipelineKpiCard}>
              <div style={styles.pipelineKpiLabel}>総リード</div>
              <div style={styles.pipelineKpiValue}>{kpiSummary.totalLeads}件</div>
            </div>
          </div>

          {/* リード一覧ヘッダー */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={styles.filterGroup}>
              {[
                { value: 'active', label: 'アクティブ' },
                { value: 'new', label: '新規' },
                { value: 'contact', label: '接触中' },
                { value: 'meeting', label: '商談中' },
                { value: 'proposal', label: '提案準備' },
                { value: 'all', label: 'すべて' },
              ].map(f => (
                <button key={f.value} onClick={() => setLeadFilter(f.value)}
                  style={{ ...styles.filterButton, ...(leadFilter === f.value ? styles.filterButtonActive : {}) }}>
                  {f.label}
                </button>
              ))}
            </div>
            <button style={styles.createButton} onClick={() => setShowLeadModal(true)}>＋ リード登録</button>
          </div>

          {/* リード一覧 */}
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>会社名</th>
                  <th style={styles.th}>担当者</th>
                  <th style={styles.th}>流入経路</th>
                  <th style={styles.th}>ステータス</th>
                  <th style={styles.th}>想定金額</th>
                  <th style={styles.th}>次アクション</th>
                  <th style={styles.th}>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map(lead => (
                  <tr key={lead.id} style={styles.tr}>
                    <td style={styles.td}>
                      <div>{lead.companyName}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{lead.email}</div>
                    </td>
                    <td style={styles.td}>{lead.contactName}</td>
                    <td style={styles.td}>{lead.source}</td>
                    <td style={styles.td}>
                      <span style={{ ...styles.badge, background: getLeadStatusColor(lead.status) }}>{lead.statusLabel}</span>
                    </td>
                    <td style={styles.tdRight}>{lead.expectedAmount ? formatCurrency(lead.expectedAmount) : '-'}</td>
                    <td style={styles.td}>
                      <div>{lead.nextAction || '-'}</div>
                      {lead.nextActionDate && <div style={{ fontSize: '11px', color: '#64748b' }}>{formatDate(lead.nextActionDate)}</div>}
                    </td>
                    <td style={styles.td}>
                      <div style={styles.actionButtons}>
                        <button style={{ ...styles.smallButton, background: '#6366f1' }} onClick={() => setEditingLead({ ...lead })}>編集</button>
                        {lead.status === 'proposal' && (
                          <button style={{ ...styles.smallButton, background: '#2d8a3e' }} onClick={() => onConvertToEstimate(lead)}>見積化</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* リードモーダル */}
          {(showLeadModal || editingLead) && (
            <div style={styles.modalOverlay} onClick={() => { setShowLeadModal(false); setEditingLead(null); }}>
              <div style={styles.createModalContent} onClick={e => e.stopPropagation()}>
                <button style={styles.modalClose} onClick={() => { setShowLeadModal(false); setEditingLead(null); }}>×</button>
                <h2 style={styles.createModalTitle}>{editingLead ? '👥 リード編集' : '👥 リード新規登録'}</h2>
                
                <div style={styles.createForm}>
                  <div style={styles.createFormRow}>
                    <div style={styles.createFormGroup}>
                      <label style={styles.createFormLabel}>会社名 *</label>
                      <input type="text" value={leadFormData.companyName} onChange={(e) => setLeadFormData({ ...leadFormData, companyName: e.target.value })} style={styles.createFormInput} placeholder="株式会社サンプル" />
                    </div>
                    <div style={styles.createFormGroup}>
                      <label style={styles.createFormLabel}>担当者名 *</label>
                      <input type="text" value={leadFormData.contactName} onChange={(e) => setLeadFormData({ ...leadFormData, contactName: e.target.value })} style={styles.createFormInput} placeholder="山田太郎" />
                    </div>
                  </div>
                  <div style={styles.createFormRow}>
                    <div style={styles.createFormGroup}>
                      <label style={styles.createFormLabel}>メール</label>
                      <input type="email" value={leadFormData.email} onChange={(e) => setLeadFormData({ ...leadFormData, email: e.target.value })} style={styles.createFormInput} />
                    </div>
                    <div style={styles.createFormGroup}>
                      <label style={styles.createFormLabel}>電話番号</label>
                      <input type="tel" value={leadFormData.tel} onChange={(e) => setLeadFormData({ ...leadFormData, tel: e.target.value })} style={styles.createFormInput} />
                    </div>
                  </div>
                  <div style={styles.createFormRow}>
                    <div style={styles.createFormGroup}>
                      <label style={styles.createFormLabel}>流入経路</label>
                      <select value={leadFormData.source} onChange={(e) => setLeadFormData({ ...leadFormData, source: e.target.value })} style={styles.createFormSelect}>
                        {sourceOptions.map(src => <option key={src} value={src}>{src}</option>)}
                      </select>
                    </div>
                    <div style={styles.createFormGroup}>
                      <label style={styles.createFormLabel}>ステータス</label>
                      <select value={leadFormData.status} onChange={(e) => setLeadFormData({ ...leadFormData, status: e.target.value })} style={styles.createFormSelect}>
                        {leadStatusOptions.filter(s => s.id !== 'converted').map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={styles.createFormRow}>
                    <div style={styles.createFormGroup}>
                      <label style={styles.createFormLabel}>案件名</label>
                      <input type="text" value={leadFormData.projectName} onChange={(e) => setLeadFormData({ ...leadFormData, projectName: e.target.value })} style={styles.createFormInput} />
                    </div>
                    <div style={styles.createFormGroup}>
                      <label style={styles.createFormLabel}>想定金額</label>
                      <input type="number" value={leadFormData.expectedAmount || ''} onChange={(e) => setLeadFormData({ ...leadFormData, expectedAmount: Number(e.target.value) })} style={styles.createFormInput} />
                    </div>
                  </div>
                  <div style={styles.createFormRow}>
                    <div style={styles.createFormGroup}>
                      <label style={styles.createFormLabel}>次アクション</label>
                      <input type="text" value={leadFormData.nextAction} onChange={(e) => setLeadFormData({ ...leadFormData, nextAction: e.target.value })} style={styles.createFormInput} />
                    </div>
                    <div style={styles.createFormGroup}>
                      <label style={styles.createFormLabel}>アクション日</label>
                      <input type="date" value={leadFormData.nextActionDate} onChange={(e) => setLeadFormData({ ...leadFormData, nextActionDate: e.target.value })} style={styles.createFormInput} />
                    </div>
                  </div>
                  <div style={styles.createFormGroup}>
                    <label style={styles.createFormLabel}>メモ</label>
                    <textarea value={leadFormData.notes} onChange={(e) => setLeadFormData({ ...leadFormData, notes: e.target.value })} style={styles.createFormTextarea} rows={3} />
                  </div>
                  <div style={styles.createFormActions}>
                    <button onClick={() => { setShowLeadModal(false); setEditingLead(null); }} style={styles.cancelButton}>キャンセル</button>
                    <button onClick={handleLeadSubmit} style={styles.submitButton}>{editingLead ? '更新する' : '登録する'}</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ========================================
// 取引先管理
// ========================================
function ClientManager({ clients, onCreateClient, onUpdateClient, onDeleteClient }) {
  const [filter, setFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    contactName: '',
    email: '',
    tel: '',
    zip: '',
    address: '',
    notes: '',
  });

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(filter.toLowerCase()) ||
    c.contactName.toLowerCase().includes(filter.toLowerCase()) ||
    c.email.toLowerCase().includes(filter.toLowerCase())
  );

  const handleEdit = (client) => {
    setFormData({ ...client });
    setEditingClient(client);
  };

  const handleSubmit = () => {
    if (!formData.name) {
      alert('会社名は必須です');
      return;
    }
    
    if (editingClient) {
      onUpdateClient({ ...editingClient, ...formData });
      setEditingClient(null);
    } else {
      onCreateClient(formData);
      setShowCreateModal(false);
    }
    
    setFormData({ name: '', contactName: '', email: '', tel: '', zip: '', address: '', notes: '' });
  };

  const handleCancel = () => {
    setEditingClient(null);
    setShowCreateModal(false);
    setFormData({ name: '', contactName: '', email: '', tel: '', zip: '', address: '', notes: '' });
  };

  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#e2e8f0', marginBottom: '20px' }}>🏢 取引先管理</h2>
      
      {/* 検索・追加バー */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="🔍 取引先を検索..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            padding: '10px 16px',
            background: 'rgba(51, 65, 85, 0.8)',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            borderRadius: '8px',
            color: '#e2e8f0',
            fontSize: '14px',
            width: '300px',
          }}
        />
        <button
          onClick={() => setShowCreateModal(true)}
          style={styles.createButton}
        >
          ＋ 取引先追加
        </button>
      </div>

      {/* 取引先一覧 */}
      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>会社名</th>
              <th style={styles.th}>担当者</th>
              <th style={styles.th}>メール</th>
              <th style={styles.th}>電話番号</th>
              <th style={styles.th}>住所</th>
              <th style={styles.th}>操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredClients.map(client => (
              <tr key={client.id} style={styles.tr}>
                <td style={styles.td}>
                  <div style={{ fontWeight: '600' }}>{client.name}</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>{client.id}</div>
                </td>
                <td style={styles.td}>{client.contactName || '-'}</td>
                <td style={styles.td}>{client.email || '-'}</td>
                <td style={styles.td}>{client.tel || '-'}</td>
                <td style={styles.td}>
                  <div style={{ fontSize: '12px' }}>{client.zip}</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>{client.address}</div>
                </td>
                <td style={styles.td}>
                  <div style={styles.actionButtons}>
                    <button 
                      style={{ ...styles.smallButton, background: '#6366f1' }}
                      onClick={() => handleEdit(client)}
                    >
                      編集
                    </button>
                    <button 
                      style={{ ...styles.smallButton, background: '#991b1b' }}
                      onClick={() => onDeleteClient(client.id)}
                    >
                      削除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredClients.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
            {filter ? '該当する取引先がありません' : '取引先が登録されていません'}
          </div>
        )}
      </div>

      {/* 作成・編集フォーム */}
      {(showCreateModal || editingClient) && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
        }} onClick={handleCancel}>
          <div style={{
            background: '#1e293b',
            borderRadius: '16px',
            padding: '32px',
            width: '100%',
            maxWidth: '600px',
            border: '1px solid rgba(148, 163, 184, 0.2)',
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#e2e8f0', marginBottom: '24px' }}>
              {editingClient ? '取引先編集' : '取引先新規登録'}
            </h3>
            
            <div style={styles.createForm}>
              <div style={styles.createFormRow}>
                <div style={styles.createFormGroup}>
                  <label style={styles.createFormLabel}>会社名 *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={styles.createFormInput}
                    placeholder="株式会社サンプル"
                  />
                </div>
                <div style={styles.createFormGroup}>
                  <label style={styles.createFormLabel}>担当者名</label>
                  <input
                    type="text"
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    style={styles.createFormInput}
                    placeholder="山田太郎"
                  />
                </div>
              </div>
              
              <div style={styles.createFormRow}>
                <div style={styles.createFormGroup}>
                  <label style={styles.createFormLabel}>メールアドレス</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    style={styles.createFormInput}
                    placeholder="contact@example.co.jp"
                  />
                </div>
                <div style={styles.createFormGroup}>
                  <label style={styles.createFormLabel}>電話番号</label>
                  <input
                    type="tel"
                    value={formData.tel}
                    onChange={(e) => setFormData({ ...formData, tel: e.target.value })}
                    style={styles.createFormInput}
                    placeholder="092-000-0000"
                  />
                </div>
              </div>
              
              <div style={styles.createFormRow}>
                <div style={{ ...styles.createFormGroup, flex: '0 0 150px' }}>
                  <label style={styles.createFormLabel}>郵便番号</label>
                  <input
                    type="text"
                    value={formData.zip}
                    onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                    style={styles.createFormInput}
                    placeholder="〒000-0000"
                  />
                </div>
                <div style={{ ...styles.createFormGroup, flex: 1 }}>
                  <label style={styles.createFormLabel}>住所</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    style={styles.createFormInput}
                    placeholder="福岡県福岡市..."
                  />
                </div>
              </div>
              
              <div style={styles.createFormGroup}>
                <label style={styles.createFormLabel}>備考</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  style={styles.createFormTextarea}
                  rows={3}
                  placeholder="メモ・備考など"
                />
              </div>
              
              <div style={styles.createFormActions}>
                <button onClick={handleCancel} style={styles.cancelButton}>
                  キャンセル
                </button>
                <button onClick={handleSubmit} style={styles.submitButton}>
                  {editingClient ? '更新する' : '登録する'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ========================================
// 設定画面
// ========================================
function Settings({ fiscalYearEndMonth, onChangeFiscalYearEndMonth, companyInfo, onChangeCompanyInfo }) {
  const fiscalYearStartMonth = (fiscalYearEndMonth % 12) + 1;
  
  // 編集モード状態
  const [editingCompany, setEditingCompany] = useState(false);
  const [editingBank, setEditingBank] = useState(null); // null or index
  const [addingBank, setAddingBank] = useState(false);
  
  // 編集中の会社情報
  const [companyForm, setCompanyForm] = useState({ ...companyInfo });
  
  // 編集中の銀行情報
  const [bankForm, setBankForm] = useState({ name: '', branch: '', type: '普通', number: '', holder: '' });
  
  const monthOptions = [
    { value: 1, label: '1月（2月〜1月）' },
    { value: 2, label: '2月（3月〜2月）' },
    { value: 3, label: '3月（4月〜3月）' },
    { value: 4, label: '4月（5月〜4月）' },
    { value: 5, label: '5月（6月〜5月）' },
    { value: 6, label: '6月（7月〜6月）' },
    { value: 7, label: '7月（8月〜7月）' },
    { value: 8, label: '8月（9月〜8月）' },
    { value: 9, label: '9月（10月〜9月）' },
    { value: 10, label: '10月（11月〜10月）' },
    { value: 11, label: '11月（12月〜11月）' },
    { value: 12, label: '12月（1月〜12月）' },
  ];

  // 会社情報編集開始
  const handleEditCompany = () => {
    setCompanyForm({ ...companyInfo });
    setEditingCompany(true);
  };

  // 会社情報保存
  const handleSaveCompany = () => {
    onChangeCompanyInfo({ ...companyInfo, ...companyForm, banks: companyInfo.banks });
    setEditingCompany(false);
  };

  // 会社情報編集キャンセル
  const handleCancelCompany = () => {
    setEditingCompany(false);
  };

  // 銀行編集開始
  const handleEditBank = (index) => {
    setBankForm({ ...companyInfo.banks[index] });
    setEditingBank(index);
  };

  // 銀行追加開始
  const handleAddBank = () => {
    setBankForm({ name: '', branch: '', type: '普通', number: '', holder: '' });
    setAddingBank(true);
  };

  // 銀行保存
  const handleSaveBank = () => {
    if (editingBank !== null) {
      const newBanks = [...companyInfo.banks];
      newBanks[editingBank] = { ...bankForm };
      onChangeCompanyInfo({ ...companyInfo, banks: newBanks });
      setEditingBank(null);
    } else if (addingBank) {
      onChangeCompanyInfo({ ...companyInfo, banks: [...companyInfo.banks, { ...bankForm }] });
      setAddingBank(false);
    }
  };

  // 銀行削除
  const handleDeleteBank = (index) => {
    if (confirm('この振込先を削除しますか？')) {
      const newBanks = companyInfo.banks.filter((_, i) => i !== index);
      onChangeCompanyInfo({ ...companyInfo, banks: newBanks });
    }
  };

  // 銀行編集キャンセル
  const handleCancelBank = () => {
    setEditingBank(null);
    setAddingBank(false);
  };

  return (
    <div style={styles.settingsContainer}>
      <h2 style={styles.sectionTitle}>⚙️ システム設定</h2>
      
      <div style={styles.settingsGrid}>
        {/* 会計年度設定 */}
        <div style={styles.settingsCard}>
          <h3 style={styles.settingsCardTitle}>📅 会計年度設定</h3>
          <p style={styles.settingsDescription}>
            決算月を設定すると、キャッシュフロー分析や営業管理のグラフ・テーブルが会計年度に合わせた表示になります。
          </p>
          
          <div style={styles.settingsFormGroup}>
            <label style={styles.settingsLabel}>決算月</label>
            <select
              value={fiscalYearEndMonth}
              onChange={(e) => onChangeFiscalYearEndMonth(parseInt(e.target.value, 10))}
              style={styles.settingsSelect}
            >
              {monthOptions.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.settingsPreview}>
            <div style={styles.settingsPreviewTitle}>現在の設定</div>
            <div style={styles.settingsPreviewContent}>
              <div style={styles.settingsPreviewRow}>
                <span style={styles.settingsPreviewLabel}>決算月</span>
                <span style={styles.settingsPreviewValue}>{fiscalYearEndMonth}月</span>
              </div>
              <div style={styles.settingsPreviewRow}>
                <span style={styles.settingsPreviewLabel}>会計年度開始月</span>
                <span style={styles.settingsPreviewValue}>{fiscalYearStartMonth}月</span>
              </div>
              <div style={styles.settingsPreviewRow}>
                <span style={styles.settingsPreviewLabel}>会計年度期間</span>
                <span style={styles.settingsPreviewValue}>{fiscalYearStartMonth}月 〜 {fiscalYearEndMonth}月</span>
              </div>
            </div>
          </div>

          <div style={styles.settingsNote}>
            <span style={styles.settingsNoteIcon}>💡</span>
            <span>例：5月決算の場合、会計年度は6月から翌年5月までとなります。</span>
          </div>
        </div>

        {/* 会社情報設定 */}
        <div style={styles.settingsCard}>
          <div style={styles.settingsCardHeader}>
            <h3 style={styles.settingsCardTitle}>🏢 会社情報</h3>
            {!editingCompany && (
              <button style={styles.editButton} onClick={handleEditCompany}>
                ✎ 編集
              </button>
            )}
          </div>
          <p style={styles.settingsDescription}>
            見積書・請求書に表示される会社情報です。
          </p>
          
          {editingCompany ? (
            <div style={styles.editForm}>
              <div style={styles.editFormGroup}>
                <label style={styles.editFormLabel}>会社名</label>
                <input
                  type="text"
                  value={companyForm.name}
                  onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                  style={styles.editFormInput}
                />
              </div>
              <div style={styles.editFormGroup}>
                <label style={styles.editFormLabel}>郵便番号</label>
                <input
                  type="text"
                  value={companyForm.zip}
                  onChange={(e) => setCompanyForm({ ...companyForm, zip: e.target.value })}
                  style={styles.editFormInput}
                  placeholder="〒000-0000"
                />
              </div>
              <div style={styles.editFormGroup}>
                <label style={styles.editFormLabel}>住所</label>
                <input
                  type="text"
                  value={companyForm.address}
                  onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                  style={styles.editFormInput}
                />
              </div>
              <div style={styles.editFormGroup}>
                <label style={styles.editFormLabel}>建物名</label>
                <input
                  type="text"
                  value={companyForm.building}
                  onChange={(e) => setCompanyForm({ ...companyForm, building: e.target.value })}
                  style={styles.editFormInput}
                />
              </div>
              <div style={styles.editFormRow}>
                <div style={styles.editFormGroup}>
                  <label style={styles.editFormLabel}>TEL</label>
                  <input
                    type="text"
                    value={companyForm.tel}
                    onChange={(e) => setCompanyForm({ ...companyForm, tel: e.target.value })}
                    style={styles.editFormInput}
                  />
                </div>
                <div style={styles.editFormGroup}>
                  <label style={styles.editFormLabel}>FAX</label>
                  <input
                    type="text"
                    value={companyForm.fax}
                    onChange={(e) => setCompanyForm({ ...companyForm, fax: e.target.value })}
                    style={styles.editFormInput}
                  />
                </div>
              </div>
              <div style={styles.editFormGroup}>
                <label style={styles.editFormLabel}>Email</label>
                <input
                  type="email"
                  value={companyForm.email}
                  onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                  style={styles.editFormInput}
                />
              </div>
              <div style={styles.editFormActions}>
                <button style={styles.cancelBtn} onClick={handleCancelCompany}>キャンセル</button>
                <button style={styles.saveBtn} onClick={handleSaveCompany}>保存</button>
              </div>
            </div>
          ) : (
            <div style={styles.companyInfoDisplay}>
              <div style={styles.companyInfoRow}>
                <span style={styles.companyInfoLabel}>会社名</span>
                <span style={styles.companyInfoValue}>{companyInfo.name}</span>
              </div>
              <div style={styles.companyInfoRow}>
                <span style={styles.companyInfoLabel}>住所</span>
                <span style={styles.companyInfoValue}>
                  {companyInfo.zip}<br />
                  {companyInfo.address}<br />
                  {companyInfo.building}
                </span>
              </div>
              <div style={styles.companyInfoRow}>
                <span style={styles.companyInfoLabel}>TEL</span>
                <span style={styles.companyInfoValue}>{companyInfo.tel}</span>
              </div>
              <div style={styles.companyInfoRow}>
                <span style={styles.companyInfoLabel}>FAX</span>
                <span style={styles.companyInfoValue}>{companyInfo.fax}</span>
              </div>
              <div style={styles.companyInfoRow}>
                <span style={styles.companyInfoLabel}>Email</span>
                <span style={styles.companyInfoValue}>{companyInfo.email}</span>
              </div>
            </div>
          )}
        </div>

        {/* 振込先情報 */}
        <div style={styles.settingsCard}>
          <div style={styles.settingsCardHeader}>
            <h3 style={styles.settingsCardTitle}>🏦 振込先情報</h3>
            {!addingBank && editingBank === null && (
              <button style={styles.editButton} onClick={handleAddBank}>
                ＋ 追加
              </button>
            )}
          </div>
          <p style={styles.settingsDescription}>
            請求書に表示される振込先情報です。
          </p>
          
          {/* 銀行追加/編集フォーム */}
          {(addingBank || editingBank !== null) && (
            <div style={styles.bankEditForm}>
              <h4 style={styles.bankEditTitle}>
                {addingBank ? '振込先を追加' : '振込先を編集'}
              </h4>
              <div style={styles.editFormRow}>
                <div style={styles.editFormGroup}>
                  <label style={styles.editFormLabel}>銀行名</label>
                  <input
                    type="text"
                    value={bankForm.name}
                    onChange={(e) => setBankForm({ ...bankForm, name: e.target.value })}
                    style={styles.editFormInput}
                    placeholder="○○銀行"
                  />
                </div>
                <div style={styles.editFormGroup}>
                  <label style={styles.editFormLabel}>支店名</label>
                  <input
                    type="text"
                    value={bankForm.branch}
                    onChange={(e) => setBankForm({ ...bankForm, branch: e.target.value })}
                    style={styles.editFormInput}
                    placeholder="○○支店"
                  />
                </div>
              </div>
              <div style={styles.editFormRow}>
                <div style={styles.editFormGroup}>
                  <label style={styles.editFormLabel}>口座種別</label>
                  <select
                    value={bankForm.type}
                    onChange={(e) => setBankForm({ ...bankForm, type: e.target.value })}
                    style={styles.editFormSelect}
                  >
                    <option value="普通">普通</option>
                    <option value="当座">当座</option>
                  </select>
                </div>
                <div style={styles.editFormGroup}>
                  <label style={styles.editFormLabel}>口座番号</label>
                  <input
                    type="text"
                    value={bankForm.number}
                    onChange={(e) => setBankForm({ ...bankForm, number: e.target.value })}
                    style={styles.editFormInput}
                    placeholder="1234567"
                  />
                </div>
              </div>
              <div style={styles.editFormGroup}>
                <label style={styles.editFormLabel}>口座名義</label>
                <input
                  type="text"
                  value={bankForm.holder}
                  onChange={(e) => setBankForm({ ...bankForm, holder: e.target.value })}
                  style={styles.editFormInput}
                  placeholder="カ）○○○○"
                />
              </div>
              <div style={styles.editFormActions}>
                <button style={styles.cancelBtn} onClick={handleCancelBank}>キャンセル</button>
                <button style={styles.saveBtn} onClick={handleSaveBank}>保存</button>
              </div>
            </div>
          )}
          
          <div style={styles.bankInfoDisplay}>
            {companyInfo.banks.map((bank, idx) => (
              <div key={idx} style={styles.bankInfoItem}>
                <div style={styles.bankInfoContent}>
                  <div style={styles.bankInfoName}>{bank.name}</div>
                  <div style={styles.bankInfoDetail}>
                    {bank.branch} / {bank.type} / {bank.number}
                  </div>
                  <div style={styles.bankInfoHolder}>口座名義: {bank.holder}</div>
                </div>
                {!addingBank && editingBank === null && (
                  <div style={styles.bankInfoActions}>
                    <button 
                      style={styles.bankEditBtn}
                      onClick={() => handleEditBank(idx)}
                    >
                      編集
                    </button>
                    <button 
                      style={styles.bankDeleteBtn}
                      onClick={() => handleDeleteBank(idx)}
                    >
                      削除
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ========================================
// PDF モーダル（見積書・請求書）
// ========================================
function PdfModal({ estimate, type, onClose, companyInfo }) {
  const isInvoice = type === 'invoice';
  const title = isInvoice ? '請求書' : '見積書';
  const docNumber = isInvoice ? estimate.invoiceData?.id : estimate.id;
  const docDate = isInvoice
    ? estimate.invoiceData?.issuedAt
    : estimate.createdAt;

  const subtotal = calculateTotal(estimate.items);
  const tax = calculateTax(subtotal);
  const total = subtotal + tax;

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
        <button style={styles.modalClose} onClick={onClose}>×</button>

        {/* PDF プレビュー */}
        <div style={styles.pdfPreview}>
          {/* 右上: 日付と番号 */}
          <div style={styles.pdfTopRight}>
            <div>{formatDate(docDate)}</div>
            <div>No. {docNumber}</div>
          </div>

          {/* タイトル */}
          <h1 style={styles.pdfTitle}>{title}</h1>

          {/* 本文エリア */}
          <div style={styles.pdfBody}>
            {/* 左側: 宛先情報 */}
            <div style={styles.pdfLeft}>
              <div style={styles.pdfClient}>
                {estimate.clientName}　様
              </div>
              <p style={styles.pdfIntro}>
                下記のとおり{isInvoice ? 'ご請求' : 'お見積'}申し上げます。
              </p>
              <div style={styles.pdfTotalBox}>
                <span style={styles.pdfTotalLabel}>{isInvoice ? '請求金額' : '見積金額'}</span>
                <span style={styles.pdfTotalValue}>{formatCurrency(total)}</span>
              </div>
              {!isInvoice && (
                <div style={styles.pdfValidUntil}>
                  有効期限: {formatDate(estimate.validUntil)}
                </div>
              )}
            </div>

            {/* 右側: 会社情報 */}
            <div style={styles.pdfRight}>
              <div style={styles.pdfCompanyInfo}>
                <strong style={styles.pdfCompanyName}>{companyInfo.name}</strong>
                <div>{companyInfo.zip}</div>
                <div>{companyInfo.address}</div>
                <div>{companyInfo.building}</div>
                <div>TEL: {companyInfo.tel}</div>
                <div>FAX: {companyInfo.fax}</div>
                <div>Email: {companyInfo.email}</div>
              </div>
              <div style={styles.pdfSeal}>印</div>
            </div>
          </div>

          {/* 明細テーブル */}
          <table style={styles.pdfTable}>
            <thead>
              <tr>
                <th style={{ ...styles.pdfTh, width: '50%' }}>品番・品名</th>
                <th style={{ ...styles.pdfTh, width: '15%' }}>数量</th>
                <th style={{ ...styles.pdfTh, width: '17%' }}>単価</th>
                <th style={{ ...styles.pdfTh, width: '18%' }}>金額</th>
              </tr>
            </thead>
            <tbody>
              {estimate.items.map((item, idx) => (
                <tr key={idx}>
                  <td style={styles.pdfTd}>{item.name}</td>
                  <td style={styles.pdfTdCenter}>{item.quantity}</td>
                  <td style={styles.pdfTdRight}>{formatCurrency(item.unitPrice)}</td>
                  <td style={styles.pdfTdRight}>{formatCurrency(item.quantity * item.unitPrice)}</td>
                </tr>
              ))}
              {/* 空行で8行分確保 */}
              {Array.from({ length: Math.max(0, 8 - estimate.items.length) }).map((_, idx) => (
                <tr key={`empty-${idx}`}>
                  <td style={styles.pdfTd}>&nbsp;</td>
                  <td style={styles.pdfTdCenter}></td>
                  <td style={styles.pdfTdRight}></td>
                  <td style={styles.pdfTdRight}></td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* 合計欄 */}
          <div style={styles.pdfTotals}>
            <div style={styles.pdfTotalRow}>
              <span>小計</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div style={styles.pdfTotalRow}>
              <span>消費税（10% 内税）</span>
              <span>（{formatCurrency(tax)}）</span>
            </div>
            <div style={{ ...styles.pdfTotalRow, ...styles.pdfGrandTotal }}>
              <span>合計</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>

          {/* 振込先（請求書のみ） */}
          {isInvoice && (
            <div style={styles.pdfBankInfo}>
              <div style={styles.pdfBankTitle}>お振込先</div>
              {companyInfo.banks.map((bank, idx) => (
                <div key={idx} style={styles.pdfBankRow}>
                  {bank.name} {bank.branch} {bank.type} {bank.number} {bank.holder}
                </div>
              ))}
            </div>
          )}

          {/* 備考 */}
          {estimate.notes && (
            <div style={styles.pdfNotes}>
              <div style={styles.pdfNotesTitle}>備考</div>
              <div>{estimate.notes}</div>
            </div>
          )}
        </div>

        {/* アクションボタン */}
        <div style={styles.modalActions}>
          <button style={styles.actionButton}>PDFダウンロード</button>
          <button style={{ ...styles.actionButton, background: '#2d7ab8' }}>メール送信</button>
        </div>
      </div>
    </div>
  );
}

// ========================================
// ヘルパー関数
// ========================================
function getBadgeColor(stage) {
  const colors = {
    proposal: '#2d7ab8',
    won: '#2d8a3e',
    completed: '#1a5f2a',
    lost: '#991b1b'
  };
  return colors[stage] || '#2d7ab8';
}

// ========================================
// スタイル定義
// ========================================
const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
    color: '#e2e8f0',
    fontFamily: '"Noto Sans JP", "Hiragino Sans", sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 32px',
    background: 'rgba(15, 23, 42, 0.95)',
    borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '12px',
  },
  logo: {
    fontSize: '28px',
    fontWeight: '700',
    background: 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: 0,
    letterSpacing: '2px',
  },
  logoSub: {
    fontSize: '14px',
    color: '#94a3b8',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  headerButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    background: 'rgba(51, 65, 85, 0.8)',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    borderRadius: '8px',
    color: '#e2e8f0',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  dateDisplay: {
    fontSize: '14px',
    color: '#94a3b8',
  },
  nav: {
    display: 'flex',
    gap: '4px',
    padding: '12px 32px',
    background: 'rgba(30, 41, 59, 0.5)',
    borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
  },
  navButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    background: 'transparent',
    border: 'none',
    borderRadius: '8px',
    color: '#94a3b8',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  navButtonActive: {
    background: 'rgba(96, 165, 250, 0.15)',
    color: '#60a5fa',
  },
  navIcon: {
    fontSize: '18px',
  },
  main: {
    padding: '24px 32px',
    maxWidth: '1600px',
    margin: '0 auto',
  },

  // ダッシュボード
  dashboard: {},
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '20px',
    marginBottom: '24px',
  },
  kpiCard: {
    padding: '24px',
    borderRadius: '16px',
    position: 'relative',
    overflow: 'hidden',
  },
  kpiIcon: {
    fontSize: '32px',
    marginBottom: '8px',
  },
  kpiLabel: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: '4px',
  },
  kpiValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#fff',
  },
  dashboardGrid: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    gap: '20px',
  },
  card: {
    background: 'rgba(30, 41, 59, 0.6)',
    borderRadius: '16px',
    padding: '24px',
    border: '1px solid rgba(148, 163, 184, 0.1)',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '16px',
    color: '#e2e8f0',
  },

  // テーブル
  tableContainer: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '12px 16px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#94a3b8',
    borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  sortableTh: {
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'color 0.2s, background 0.2s',
    ':hover': {
      color: '#60a5fa',
    },
  },
  tr: {
    borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
  },
  td: {
    padding: '12px 16px',
    fontSize: '14px',
    color: '#e2e8f0',
  },
  tdRight: {
    padding: '12px 16px',
    fontSize: '14px',
    color: '#e2e8f0',
    textAlign: 'right',
  },
  tdCenter: {
    padding: '12px 16px',
    fontSize: '14px',
    color: '#e2e8f0',
    textAlign: 'center',
  },
  badge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500',
    color: '#fff',
  },
  smallButton: {
    padding: '6px 12px',
    background: '#475569',
    border: 'none',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  actionButtons: {
    display: 'flex',
    gap: '8px',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: '14px',
    textAlign: 'center',
    padding: '20px',
  },
  alertList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  alertItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    background: 'rgba(239, 68, 68, 0.1)',
    borderRadius: '8px',
    border: '1px solid rgba(239, 68, 68, 0.2)',
  },
  alertMeta: {
    fontSize: '12px',
    color: '#f87171',
  },
  alertAmount: {
    fontWeight: '600',
    color: '#f87171',
  },

  // リスト
  listContainer: {},
  listHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  listHeaderRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  listTitle: {
    fontSize: '20px',
    fontWeight: '600',
    margin: 0,
  },
  createButton: {
    padding: '10px 20px',
    background: 'linear-gradient(135deg, #2d7ab8 0%, #60a5fa 100%)',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    boxShadow: '0 2px 8px rgba(96, 165, 250, 0.3)',
  },
  // 新規作成モーダル
  createModalContent: {
    background: '#1e293b',
    borderRadius: '16px',
    width: '90%',
    maxWidth: '700px',
    maxHeight: '90vh',
    overflow: 'auto',
    position: 'relative',
    color: '#e2e8f0',
    padding: '32px',
  },
  createModalTitle: {
    fontSize: '22px',
    fontWeight: '600',
    marginBottom: '24px',
    paddingBottom: '16px',
    borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
  },
  createForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  createFormRow: {
    display: 'flex',
    gap: '16px',
  },
  createFormGroup: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  createFormLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  createFormInput: {
    padding: '12px 16px',
    background: 'rgba(51, 65, 85, 0.8)',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    borderRadius: '8px',
    color: '#e2e8f0',
    fontSize: '15px',
  },
  createFormSelect: {
    padding: '12px 16px',
    background: 'rgba(51, 65, 85, 0.8)',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    borderRadius: '8px',
    color: '#e2e8f0',
    fontSize: '15px',
    cursor: 'pointer',
  },
  createFormTextarea: {
    padding: '12px 16px',
    background: 'rgba(51, 65, 85, 0.8)',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    borderRadius: '8px',
    color: '#e2e8f0',
    fontSize: '15px',
    resize: 'vertical',
    minHeight: '80px',
  },
  itemsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  itemRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  itemAmount: {
    width: '120px',
    textAlign: 'right',
    fontSize: '14px',
    color: '#60a5fa',
    fontWeight: '600',
  },
  removeItemButton: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(239, 68, 68, 0.2)',
    border: 'none',
    borderRadius: '6px',
    color: '#f87171',
    cursor: 'pointer',
    fontSize: '14px',
  },
  addItemButton: {
    padding: '10px 16px',
    background: 'rgba(96, 165, 250, 0.1)',
    border: '1px dashed rgba(96, 165, 250, 0.4)',
    borderRadius: '8px',
    color: '#60a5fa',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  createFormTotalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    background: 'rgba(51, 65, 85, 0.5)',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
  },
  createFormTotalValue: {
    fontSize: '24px',
    color: '#60a5fa',
  },
  createFormActions: {
    display: 'flex',
    gap: '12px',
    marginTop: '8px',
  },
  cancelButton: {
    flex: 1,
    padding: '14px 24px',
    background: 'rgba(71, 85, 105, 0.5)',
    border: 'none',
    borderRadius: '8px',
    color: '#94a3b8',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  submitButton: {
    flex: 1,
    padding: '14px 24px',
    background: 'linear-gradient(135deg, #2d8a3e 0%, #4ade80 100%)',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(74, 222, 128, 0.3)',
  },
  // 未請求通知
  unbilledNotice: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '12px',
    padding: '16px 20px',
    background: 'rgba(251, 191, 36, 0.1)',
    borderRadius: '12px',
    border: '1px solid rgba(251, 191, 36, 0.3)',
    marginBottom: '20px',
    fontSize: '14px',
    color: '#fbbf24',
  },
  unbilledNoticeIcon: {
    fontSize: '18px',
  },
  unbilledList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    width: '100%',
    marginTop: '8px',
  },
  unbilledItem: {
    padding: '8px 14px',
    background: 'rgba(251, 191, 36, 0.2)',
    border: 'none',
    borderRadius: '6px',
    color: '#fbbf24',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  filterGroup: {
    display: 'flex',
    gap: '8px',
  },
  filterButton: {
    padding: '8px 16px',
    background: 'rgba(71, 85, 105, 0.5)',
    border: 'none',
    borderRadius: '8px',
    color: '#94a3b8',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  filterButtonActive: {
    background: 'rgba(96, 165, 250, 0.2)',
    color: '#60a5fa',
  },

  // キャッシュフロー
  cashflowContainer: {},
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '600',
    marginBottom: '20px',
  },
  cashflowSummary: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
    marginBottom: '24px',
  },
  summaryCard: {
    background: 'rgba(30, 41, 59, 0.6)',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid rgba(148, 163, 184, 0.1)',
  },
  summaryLabel: {
    fontSize: '13px',
    color: '#94a3b8',
    marginBottom: '8px',
  },
  summaryValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#e2e8f0',
  },
  chartCard: {
    background: 'rgba(30, 41, 59, 0.6)',
    borderRadius: '16px',
    padding: '24px',
    border: '1px solid rgba(148, 163, 184, 0.1)',
    marginBottom: '24px',
  },
  chartTitle: {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '20px',
  },
  chart: {
    display: 'flex',
    height: '250px',
    gap: '16px',
  },
  chartYAxis: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    fontSize: '11px',
    color: '#94a3b8',
    paddingRight: '8px',
    textAlign: 'right',
    width: '100px',
  },
  chartBars: {
    flex: 1,
    display: 'flex',
    alignItems: 'flex-end',
    gap: '24px',
    borderLeft: '1px solid rgba(148, 163, 184, 0.2)',
    borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
    paddingLeft: '16px',
    paddingBottom: '24px',
  },
  chartBarGroup: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    height: '100%',
  },
  chartBarValue: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#60a5fa',
    marginBottom: '4px',
    minHeight: '16px',
  },
  chartBarContainer: {
    flex: 1,
    width: '100%',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: '4px',
    position: 'relative',
  },
  chartBudgetLine: {
    position: 'absolute',
    left: '0',
    right: '0',
    height: '3px',
    background: '#ef4444',
    borderRadius: '2px',
    zIndex: 10,
    boxShadow: '0 0 4px rgba(239, 68, 68, 0.5)',
  },
  chartBar: {
    width: '24px',
    borderRadius: '4px 4px 0 0',
    transition: 'height 0.3s',
  },
  chartLabel: {
    marginTop: '8px',
    fontSize: '13px',
    color: '#94a3b8',
  },
  chartLegend: {
    display: 'flex',
    justifyContent: 'center',
    gap: '24px',
    marginTop: '16px',
    fontSize: '13px',
    color: '#94a3b8',
  },
  legendDot: {
    display: 'inline-block',
    width: '12px',
    height: '12px',
    borderRadius: '3px',
    marginRight: '6px',
  },

  // パイプライン
  pipelineContainer: {},
  pipelineKpi: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
    marginBottom: '24px',
  },
  pipelineKpiCard: {
    background: 'rgba(30, 41, 59, 0.6)',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid rgba(148, 163, 184, 0.1)',
  },
  pipelineKpiLabel: {
    fontSize: '13px',
    color: '#94a3b8',
    marginBottom: '8px',
  },
  pipelineKpiValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#e2e8f0',
  },

  // 予算管理
  budgetSection: {
    background: 'rgba(30, 41, 59, 0.6)',
    borderRadius: '16px',
    padding: '24px',
    border: '1px solid rgba(148, 163, 184, 0.1)',
    marginBottom: '24px',
  },
  budgetTableContainer: {
    overflowX: 'auto',
  },
  budgetTable: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  budgetTh: {
    textAlign: 'left',
    padding: '12px 16px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#94a3b8',
    borderBottom: '2px solid rgba(148, 163, 184, 0.2)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  budgetTr: {
    borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
    transition: 'background 0.2s',
  },
  budgetTd: {
    padding: '12px 16px',
    fontSize: '14px',
    color: '#e2e8f0',
  },
  currentBadge: {
    display: 'inline-block',
    marginLeft: '8px',
    padding: '2px 8px',
    background: 'rgba(96, 165, 250, 0.3)',
    borderRadius: '10px',
    fontSize: '10px',
    color: '#60a5fa',
    fontWeight: '600',
  },
  budgetClickable: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '6px',
    transition: 'background 0.2s',
  },
  editIcon: {
    opacity: 0.4,
    fontSize: '12px',
    transition: 'opacity 0.2s',
  },
  budgetEditContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  budgetInput: {
    width: '120px',
    padding: '6px 10px',
    background: 'rgba(51, 65, 85, 0.8)',
    border: '1px solid rgba(96, 165, 250, 0.5)',
    borderRadius: '6px',
    color: '#e2e8f0',
    fontSize: '14px',
  },
  budgetSaveBtn: {
    padding: '6px 10px',
    background: '#2d8a3e',
    border: 'none',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '12px',
    cursor: 'pointer',
  },
  rateBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#fff',
  },
  progressBarContainer: {
    position: 'relative',
    height: '20px',
    background: 'rgba(71, 85, 105, 0.5)',
    borderRadius: '10px',
    overflow: 'hidden',
  },
  progressBarFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    borderRadius: '10px',
    transition: 'width 0.3s',
  },
  progressBarPipeline: {
    position: 'absolute',
    top: 0,
    height: '100%',
    background: 'rgba(251, 191, 36, 0.5)',
    borderRadius: '0 10px 10px 0',
  },
  progressBarTarget: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: '2px',
    height: '100%',
    background: '#fff',
    opacity: 0.5,
  },

  // セクションヘッダー
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  fiscalYearBadge: {
    padding: '8px 16px',
    background: 'rgba(96, 165, 250, 0.2)',
    borderRadius: '20px',
    fontSize: '13px',
    color: '#60a5fa',
    fontWeight: '500',
  },

  // 表示モード切り替えタブ
  viewModeTabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '20px',
  },
  viewModeTab: {
    flex: 1,
    padding: '12px 20px',
    background: 'rgba(51, 65, 85, 0.5)',
    border: 'none',
    borderRadius: '10px',
    color: '#94a3b8',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  viewModeTabActive: {
    background: 'rgba(96, 165, 250, 0.2)',
    color: '#60a5fa',
    fontWeight: '600',
  },

  // 設定画面
  settingsContainer: {
    padding: '0',
  },
  settingsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '24px',
  },
  settingsCard: {
    background: 'rgba(30, 41, 59, 0.6)',
    borderRadius: '16px',
    padding: '24px',
    border: '1px solid rgba(148, 163, 184, 0.1)',
  },
  settingsCardTitle: {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '12px',
    color: '#e2e8f0',
  },
  settingsDescription: {
    fontSize: '14px',
    color: '#94a3b8',
    marginBottom: '20px',
    lineHeight: '1.6',
  },
  settingsFormGroup: {
    marginBottom: '20px',
  },
  settingsLabel: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  settingsSelect: {
    width: '100%',
    padding: '12px 16px',
    background: 'rgba(51, 65, 85, 0.8)',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    borderRadius: '8px',
    color: '#e2e8f0',
    fontSize: '15px',
    cursor: 'pointer',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
    backgroundSize: '20px',
  },
  settingsPreview: {
    background: 'rgba(51, 65, 85, 0.5)',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '16px',
  },
  settingsPreviewTitle: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  settingsPreviewContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  settingsPreviewRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingsPreviewLabel: {
    fontSize: '13px',
    color: '#94a3b8',
  },
  settingsPreviewValue: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#60a5fa',
  },
  settingsNote: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    padding: '12px 16px',
    background: 'rgba(251, 191, 36, 0.1)',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#fbbf24',
  },
  settingsNoteIcon: {
    flexShrink: 0,
  },
  companyInfoDisplay: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '16px',
  },
  companyInfoRow: {
    display: 'flex',
    gap: '16px',
  },
  companyInfoLabel: {
    width: '80px',
    flexShrink: 0,
    fontSize: '13px',
    color: '#94a3b8',
  },
  companyInfoValue: {
    fontSize: '14px',
    color: '#e2e8f0',
    lineHeight: '1.5',
  },
  bankInfoDisplay: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginBottom: '16px',
  },
  bankInfoItem: {
    padding: '12px 16px',
    background: 'rgba(51, 65, 85, 0.5)',
    borderRadius: '8px',
  },
  bankInfoName: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: '4px',
  },
  bankInfoDetail: {
    fontSize: '13px',
    color: '#94a3b8',
    marginBottom: '4px',
  },
  bankInfoHolder: {
    fontSize: '12px',
    color: '#64748b',
  },

  // 設定カードヘッダー
  settingsCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  editButton: {
    padding: '6px 12px',
    background: 'rgba(96, 165, 250, 0.2)',
    border: 'none',
    borderRadius: '6px',
    color: '#60a5fa',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },

  // 編集フォーム
  editForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  editFormGroup: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  editFormRow: {
    display: 'flex',
    gap: '12px',
  },
  editFormLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#94a3b8',
  },
  editFormInput: {
    padding: '10px 12px',
    background: 'rgba(51, 65, 85, 0.8)',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    borderRadius: '6px',
    color: '#e2e8f0',
    fontSize: '14px',
  },
  editFormSelect: {
    padding: '10px 12px',
    background: 'rgba(51, 65, 85, 0.8)',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    borderRadius: '6px',
    color: '#e2e8f0',
    fontSize: '14px',
    cursor: 'pointer',
  },
  editFormActions: {
    display: 'flex',
    gap: '10px',
    marginTop: '8px',
  },
  cancelBtn: {
    flex: 1,
    padding: '10px 16px',
    background: 'rgba(71, 85, 105, 0.5)',
    border: 'none',
    borderRadius: '6px',
    color: '#94a3b8',
    fontSize: '14px',
    cursor: 'pointer',
  },
  saveBtn: {
    flex: 1,
    padding: '10px 16px',
    background: 'linear-gradient(135deg, #2d8a3e 0%, #4ade80 100%)',
    border: 'none',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },

  // 銀行編集フォーム
  bankEditForm: {
    background: 'rgba(51, 65, 85, 0.5)',
    borderRadius: '10px',
    padding: '16px',
    marginBottom: '16px',
  },
  bankEditTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: '12px',
  },
  bankInfoContent: {
    flex: 1,
  },
  bankInfoActions: {
    display: 'flex',
    gap: '8px',
    marginTop: '8px',
  },
  bankEditBtn: {
    padding: '4px 10px',
    background: 'rgba(96, 165, 250, 0.2)',
    border: 'none',
    borderRadius: '4px',
    color: '#60a5fa',
    fontSize: '12px',
    cursor: 'pointer',
  },
  bankDeleteBtn: {
    padding: '4px 10px',
    background: 'rgba(239, 68, 68, 0.2)',
    border: 'none',
    borderRadius: '4px',
    color: '#f87171',
    fontSize: '12px',
    cursor: 'pointer',
  },
  emptyText: {
    color: '#64748b',
    fontSize: '14px',
    textAlign: 'center',
    padding: '20px',
  },

  // 予算チャート
  budgetChartContainer: {
    marginBottom: '24px',
  },
  budgetChart: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: '200px',
    padding: '20px',
    background: 'rgba(51, 65, 85, 0.3)',
    borderRadius: '12px',
  },
  budgetChartBar: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flex: 1,
    height: '100%',
  },
  budgetChartBarStack: {
    position: 'relative',
    width: '40px',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
  },
  budgetChartBarBg: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    background: 'rgba(71, 85, 105, 0.5)',
    borderRadius: '4px 4px 0 0',
  },
  budgetChartBarFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: '4px 4px 0 0',
    transition: 'height 0.3s',
  },
  budgetChartBarPipeline: {
    position: 'absolute',
    left: 0,
    right: 0,
    background: 'rgba(251, 191, 36, 0.5)',
  },
  budgetChartLabel: {
    marginTop: '12px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    fontSize: '13px',
    color: '#94a3b8',
  },
  budgetChartValue: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#60a5fa',
  },
  budgetChartLegend: {
    display: 'flex',
    justifyContent: 'center',
    gap: '24px',
    marginTop: '16px',
    fontSize: '13px',
    color: '#94a3b8',
  },

  // 営業分析
  salesAnalytics: {
    background: 'rgba(30, 41, 59, 0.6)',
    borderRadius: '16px',
    padding: '24px',
    border: '1px solid rgba(148, 163, 184, 0.1)',
    marginBottom: '24px',
  },
  analyticsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '20px',
  },
  analyticsCard: {
    background: 'rgba(51, 65, 85, 0.4)',
    borderRadius: '12px',
    padding: '20px',
  },
  analyticsCardTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: '16px',
  },
  stageChart: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  stageChartRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  stageChartLabel: {
    width: '80px',
    fontSize: '13px',
    color: '#94a3b8',
  },
  stageChartBarContainer: {
    flex: 1,
    height: '24px',
    background: 'rgba(71, 85, 105, 0.3)',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  stageChartBar: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.3s',
  },
  stageChartValue: {
    width: '50px',
    textAlign: 'right',
    fontSize: '13px',
    fontWeight: '600',
    color: '#e2e8f0',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
  },
  metricItem: {
    textAlign: 'center',
    padding: '16px',
    background: 'rgba(71, 85, 105, 0.3)',
    borderRadius: '8px',
  },
  metricValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#60a5fa',
    marginBottom: '4px',
  },
  metricLabel: {
    fontSize: '12px',
    color: '#94a3b8',
  },
  distributionChart: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  distributionRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  distributionLabel: {
    width: '80px',
    fontSize: '12px',
    color: '#94a3b8',
  },
  distributionBarContainer: {
    flex: 1,
    height: '20px',
    background: 'rgba(71, 85, 105, 0.3)',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  distributionBar: {
    height: '100%',
    background: 'linear-gradient(90deg, #60a5fa 0%, #a78bfa 100%)',
    borderRadius: '4px',
    transition: 'width 0.3s',
  },
  distributionValue: {
    width: '50px',
    textAlign: 'right',
    fontSize: '12px',
    fontWeight: '600',
    color: '#e2e8f0',
  },
  topClientsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  topClientRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  topClientRank: {
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(96, 165, 250, 0.2)',
    borderRadius: '50%',
    fontSize: '12px',
    fontWeight: '700',
    color: '#60a5fa',
  },
  topClientName: {
    width: '120px',
    fontSize: '13px',
    color: '#e2e8f0',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  topClientBarContainer: {
    flex: 1,
    height: '16px',
    background: 'rgba(71, 85, 105, 0.3)',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  topClientBar: {
    height: '100%',
    background: 'linear-gradient(90deg, #2d8a3e 0%, #4ade80 100%)',
    borderRadius: '4px',
    transition: 'width 0.3s',
  },
  topClientValue: {
    width: '100px',
    textAlign: 'right',
    fontSize: '12px',
    fontWeight: '600',
    color: '#4ade80',
  },

  // モーダル
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modalContent: {
    background: '#fff',
    borderRadius: '16px',
    maxWidth: '800px',
    maxHeight: '90vh',
    overflow: 'auto',
    position: 'relative',
    color: '#1e293b',
  },
  modalClose: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    background: '#f1f5f9',
    border: 'none',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    fontSize: '20px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },

  // PDF プレビュー
  pdfPreview: {
    padding: '40px',
    minHeight: '600px',
  },
  pdfTopRight: {
    textAlign: 'right',
    fontSize: '13px',
    color: '#64748b',
    marginBottom: '20px',
  },
  pdfTitle: {
    textAlign: 'center',
    fontSize: '28px',
    fontWeight: '400',
    letterSpacing: '12px',
    marginBottom: '32px',
    paddingBottom: '12px',
    borderBottom: '2px solid #1e293b',
  },
  pdfBody: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '32px',
  },
  pdfLeft: {
    flex: 1,
  },
  pdfClient: {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '16px',
    paddingBottom: '8px',
    borderBottom: '1px solid #1e293b',
  },
  pdfIntro: {
    fontSize: '14px',
    marginBottom: '20px',
    color: '#475569',
  },
  pdfTotalBox: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    background: '#f8fafc',
    borderRadius: '8px',
    marginBottom: '12px',
  },
  pdfTotalLabel: {
    fontSize: '14px',
    fontWeight: '600',
  },
  pdfTotalValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#0f172a',
  },
  pdfValidUntil: {
    fontSize: '13px',
    color: '#64748b',
  },
  pdfRight: {
    width: '200px',
    textAlign: 'right',
  },
  pdfCompanyInfo: {
    fontSize: '12px',
    lineHeight: '1.8',
    color: '#475569',
  },
  pdfCompanyName: {
    fontSize: '14px',
    color: '#0f172a',
    display: 'block',
    marginBottom: '8px',
  },
  pdfSeal: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '60px',
    height: '60px',
    border: '2px solid #dc2626',
    borderRadius: '50%',
    color: '#dc2626',
    fontSize: '18px',
    marginTop: '16px',
  },
  pdfTable: {
    width: '100%',
    borderCollapse: 'collapse',
    marginBottom: '24px',
    border: '1px solid #cbd5e1',
  },
  pdfTh: {
    padding: '10px 12px',
    background: '#f1f5f9',
    borderBottom: '2px solid #cbd5e1',
    fontSize: '13px',
    fontWeight: '600',
    textAlign: 'center',
  },
  pdfTd: {
    padding: '10px 12px',
    borderBottom: '1px solid #e2e8f0',
    fontSize: '13px',
  },
  pdfTdCenter: {
    padding: '10px 12px',
    borderBottom: '1px solid #e2e8f0',
    fontSize: '13px',
    textAlign: 'center',
  },
  pdfTdRight: {
    padding: '10px 12px',
    borderBottom: '1px solid #e2e8f0',
    fontSize: '13px',
    textAlign: 'right',
  },
  pdfTotals: {
    width: '300px',
    marginLeft: 'auto',
    marginBottom: '24px',
  },
  pdfTotalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 12px',
    fontSize: '14px',
    borderBottom: '1px solid #e2e8f0',
  },
  pdfGrandTotal: {
    fontWeight: '700',
    fontSize: '16px',
    background: '#f1f5f9',
    borderBottom: 'none',
  },
  pdfBankInfo: {
    background: '#f8fafc',
    padding: '16px 20px',
    borderRadius: '8px',
    marginBottom: '16px',
  },
  pdfBankTitle: {
    fontSize: '13px',
    fontWeight: '600',
    marginBottom: '8px',
  },
  pdfBankRow: {
    fontSize: '12px',
    color: '#475569',
    marginBottom: '4px',
  },
  pdfNotes: {
    padding: '16px 20px',
    background: '#fffbeb',
    borderRadius: '8px',
    borderLeft: '4px solid #f59e0b',
  },
  pdfNotesTitle: {
    fontSize: '13px',
    fontWeight: '600',
    marginBottom: '8px',
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    padding: '16px 40px 24px',
    background: '#f8fafc',
    borderTop: '1px solid #e2e8f0',
  },
  actionButton: {
    flex: 1,
    padding: '12px 24px',
    background: '#1e293b',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },

  // AI見積セクション
  aiSection: {
    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%)',
    borderRadius: '16px',
    padding: '24px',
    border: '1px solid rgba(139, 92, 246, 0.3)',
    marginBottom: '24px',
  },
  aiHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
  },
  aiIcon: {
    fontSize: '28px',
  },
  aiTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#e2e8f0',
    margin: 0,
  },
  aiNotice: {
    fontSize: '11px',
    color: '#f59e0b',
    background: 'rgba(245, 158, 11, 0.15)',
    padding: '4px 10px',
    borderRadius: '12px',
    marginLeft: 'auto',
  },
  aiInputContainer: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
  },
  aiTextarea: {
    flex: 1,
    padding: '14px 16px',
    background: 'rgba(30, 41, 59, 0.8)',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    borderRadius: '12px',
    color: '#e2e8f0',
    fontSize: '14px',
    resize: 'vertical',
    minHeight: '80px',
    fontFamily: 'inherit',
  },
  aiButton: {
    padding: '14px 24px',
    background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
    border: 'none',
    borderRadius: '12px',
    color: '#fff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  aiResultContainer: {
    marginTop: '20px',
    background: 'rgba(30, 41, 59, 0.8)',
    borderRadius: '12px',
    border: '1px solid rgba(139, 92, 246, 0.3)',
    overflow: 'hidden',
  },
  aiResultHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    background: 'rgba(139, 92, 246, 0.2)',
    fontSize: '14px',
    fontWeight: '600',
    color: '#a78bfa',
  },
  aiResultClose: {
    background: 'transparent',
    border: 'none',
    color: '#94a3b8',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '4px 8px',
  },
  aiResultContent: {
    padding: '16px',
  },
  aiResultRow: {
    display: 'flex',
    gap: '12px',
    marginBottom: '12px',
    fontSize: '14px',
    color: '#e2e8f0',
  },
  aiResultLabel: {
    width: '100px',
    flexShrink: 0,
    color: '#94a3b8',
    fontWeight: '500',
  },
  aiResultItems: {
    marginBottom: '16px',
  },
  aiResultTable: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '8px',
  },
  aiResultTh: {
    textAlign: 'left',
    padding: '8px 12px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#94a3b8',
    borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
  },
  aiResultTd: {
    padding: '8px 12px',
    fontSize: '13px',
    color: '#e2e8f0',
    borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
  },
  aiResultActions: {
    padding: '16px',
    borderTop: '1px solid rgba(148, 163, 184, 0.1)',
    display: 'flex',
    justifyContent: 'flex-end',
  },
  aiApplyButton: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
};

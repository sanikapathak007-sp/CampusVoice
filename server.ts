import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// Initialize Gemini Client
const geminiApiKey = process.env.GEMINI_API_KEY || '';
const ai = geminiApiKey
  ? new GoogleGenAI({
      apiKey: geminiApiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// Initialize Supabase Client if env exists
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const getSupabaseForUser = (userAuthToken?: string) => {
  if (supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('your-project-ref')) {
    return createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: userAuthToken ? { Authorization: `Bearer ${userAuthToken}` } : {},
      },
    });
  }
  return null;
};

// --------------------------------------------------------------------------
// 1. Complaint AI Classification Endpoint
// --------------------------------------------------------------------------
app.post('/api/ai/classify-complaint', async (req, res) => {
  const { title, description, type, department } = req.body;

  if (!title || !description) {
    return res.status(400).json({ error: 'Title and description are required' });
  }

  // Fallback defaults
  const fallback = {
    category: type === 'infrastructure' ? 'Equipment' : 'Academic Process',
    priority: 'Medium' as const,
    summary: description.slice(0, 120),
  };

  if (!ai) {
    console.warn('GEMINI_API_KEY is not configured, returning default classification.');
    return res.json(fallback);
  }

  try {
    const prompt = `You are an automated campus issue classifier for a college management system.
Evaluate the following complaint and categorize it accurately.

Issue Type: ${type}
Department: ${department || 'General'}
Title: ${title}
Description: ${description}

Available Categories:
- Hardware (workstations, monitors, mice, GPUs, printers)
- Software (licenses, IDEs, OS, portals, college website)
- Equipment (lab apparatus, projectors, workshop machinery, safety tools)
- Facility (AC, water leakage, lighting, seating, washrooms, power sockets)
- Teaching (faculty attendance, syllabus coverage, lecture pacing)
- Academic Workload (assignment scheduling, project submissions)
- Academic Process (exam timetable, re-evaluation delays, hall tickets, grade sheets)
- Other (anything not covered above)

Available Priorities:
- Critical: direct safety hazards (fire, live wire, water near servers/switch racks) or severe academic disruption (exam hall lock, entire lab down before exam)
- High: important lab equipment breakdown, urgent schedule clashes, blocking class instruction
- Medium: individual student workstation issue with alternatives, normal inquiry, re-evaluation delay
- Low: cosmetic issue, minor suggestion, non-urgent maintenance

Return ONLY JSON matching:
{
  "category": "Hardware" | "Software" | "Equipment" | "Facility" | "Teaching" | "Academic Workload" | "Academic Process" | "Other",
  "priority": "Low" | "Medium" | "High" | "Critical",
  "summary": "A concise 1-sentence synopsis of the core issue"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING },
            priority: { type: Type.STRING },
            summary: { type: Type.STRING },
          },
          required: ['category', 'priority', 'summary'],
        },
      },
    });

    const text = response.text;
    if (text) {
      const parsed = JSON.parse(text);
      return res.json({
        category: parsed.category || fallback.category,
        priority: ['Low', 'Medium', 'High', 'Critical'].includes(parsed.priority) ? parsed.priority : 'Medium',
        summary: parsed.summary || fallback.summary,
      });
    }

    return res.json(fallback);
  } catch (err: any) {
    console.error('Error during AI classification:', err?.message || err);
    return res.json(fallback);
  }
});

// --------------------------------------------------------------------------
// 2. Principal AI Insights Endpoint
// --------------------------------------------------------------------------
app.post('/api/ai/insights', async (req, res) => {
  const { departmentStats, recurringIssues, escalatedCount, totalOpen } = req.body;

  const fallback = {
    summary: 'Department operations indicate steady resolution times, with equipment and facility requests comprising the bulk of active tickets.',
    trends: [
      'Lab workstation hardware tickets recurring in CS blocks.',
      'Average resolution time spans 24-48 hours across engineering departments.',
    ],
    recommendations: [
      'Conduct preventative electrical & hardware audit in Computer Science Lab 2.',
      'Establish SLA threshold alerts for tickets approaching 72 hours.',
      'Standardize re-evaluation turnaround times across academic departments.',
    ],
  };

  if (!ai) {
    return res.json(fallback);
  }

  try {
    const prompt = `You are a Senior Academic Operations and Infrastructure Advisor.
Analyze this snapshot of college grievances and complaints across all departments:

Department Statistics:
${JSON.stringify(departmentStats, null, 2)}

Recurring Issues:
${JSON.stringify(recurringIssues, null, 2)}

Total Escalated (>3 days unresolved): ${escalatedCount || 0}
Total Open Tickets: ${totalOpen || 0}

Generate executive-level analytical insights.
Return ONLY JSON with this format:
{
  "summary": "2-sentence high-level executive summary of current campus health and resolution velocity",
  "trends": [
    "Identified trend 1 with root causes",
    "Identified trend 2 across departments"
  ],
  "recommendations": [
    "Specific actionable recommendation 1",
    "Specific actionable recommendation 2",
    "Specific actionable recommendation 3"
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            trends: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            recommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ['summary', 'trends', 'recommendations'],
        },
      },
    });

    const text = response.text;
    if (text) {
      const parsed = JSON.parse(text);
      return res.json(parsed);
    }
    return res.json(fallback);
  } catch (err: any) {
    console.error('Error generating AI insights:', err?.message || err);
    return res.json(fallback);
  }
});

// --------------------------------------------------------------------------
// 3. Mandatory AI Chatbot with Gemini Function Calling
// --------------------------------------------------------------------------
app.post('/api/ai/chat', async (req, res) => {
  const { messages, user_id, user_role, user_name, client_complaints, client_updates } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Messages array is required' });
  }

  const effectiveUserId = user_id || 'demo-student-1';
  const effectiveUserName = user_name || 'Student';
  const effectiveRole = user_role || 'student';

  const authHeader = req.headers.authorization;
  const userToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
  const userSupabase = getSupabaseForUser(userToken);

  // Helper tools implementation
  async function execGetMyComplaints(statusFilter?: string) {
    if (userSupabase) {
      try {
        let q = userSupabase.from('complaints').select('id, title, category, priority, status, created_at, location');
        if (effectiveRole === 'student') {
          q = q.eq('student_id', effectiveUserId);
        }
        if (statusFilter && statusFilter !== 'All') {
          q = q.eq('status', statusFilter);
        }
        const { data } = await q.order('created_at', { ascending: false });
        if (data && data.length > 0) return data;
      } catch (err) {
        console.warn('Chat Supabase get_my_complaints error:', err);
      }
    }

    // Fallback to client provided complaints (ensuring zero data mismatch)
    let list = Array.isArray(client_complaints) ? [...client_complaints] : [];
    if (effectiveRole === 'student') {
      list = list.filter((c) => c.student_id === effectiveUserId);
    }
    if (statusFilter && statusFilter !== 'All') {
      list = list.filter((c) => c.status.toLowerCase() === statusFilter.toLowerCase());
    }
    return list.map((c) => ({
      id: c.id,
      title: c.title,
      category: c.category,
      priority: c.priority,
      status: c.status,
      created_at: c.created_at,
      location: c.location,
    }));
  }

  async function execGetComplaintById(id: number) {
    let complaint: any = null;
    let updates: any[] = [];

    if (userSupabase) {
      try {
        const { data: comp } = await userSupabase.from('complaints').select('*').eq('id', id).single();
        if (comp) {
          if (effectiveRole === 'student' && comp.student_id !== effectiveUserId) {
            return { error: 'Complaint not found or access denied.' };
          }
          complaint = comp;
          const { data: upds } = await userSupabase
            .from('complaint_updates')
            .select('status, remark, created_at, author_id')
            .eq('complaint_id', id)
            .order('created_at', { ascending: false });
          updates = upds || [];
        }
      } catch (err) {
        console.warn('Chat Supabase get_complaint_by_id error:', err);
      }
    }

    if (!complaint && Array.isArray(client_complaints)) {
      const found = client_complaints.find((c) => c.id === id);
      if (found) {
        if (effectiveRole === 'student' && found.student_id !== effectiveUserId) {
          return { error: 'Complaint not found or access denied.' };
        }
        complaint = found;
        if (Array.isArray(client_updates)) {
          updates = client_updates
            .filter((u) => u.complaint_id === id)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }
      }
    }

    if (!complaint) {
      return { error: `Complaint #${id} not found.` };
    }

    const latestRemark = updates.length > 0 ? updates[0].remark : 'No remarks recorded yet.';
    const latestStatus = updates.length > 0 ? updates[0].status : complaint.status;

    return {
      id: complaint.id,
      title: complaint.title,
      type: complaint.type,
      category: complaint.category,
      priority: complaint.priority,
      status: complaint.status,
      latest_status: latestStatus,
      latest_remark: latestRemark,
      location: complaint.location,
      department: complaint.department,
      created_at: complaint.created_at,
      all_updates: updates.slice(0, 3).map((u) => ({
        status: u.status,
        remark: u.remark,
        time: u.created_at,
      })),
    };
  }

  async function execCountMyComplaints() {
    const all = await execGetMyComplaints();
    const counts = {
      total: all.length,
      submitted: all.filter((c: any) => c.status === 'Submitted').length,
      under_review: all.filter((c: any) => c.status === 'Under Review').length,
      in_progress: all.filter((c: any) => c.status === 'In Progress').length,
      resolved: all.filter((c: any) => c.status === 'Resolved').length,
      pending: all.filter((c: any) => c.status !== 'Resolved').length,
    };
    return counts;
  }

  // Tool declarations per user instructions
  const getMyComplaintsDeclaration = {
    name: 'get_my_complaints',
    description: "Returns the current user's complaints, optionally filtered by status ('Submitted', 'Under Review', 'In Progress', 'Resolved').",
    parameters: {
      type: Type.OBJECT,
      properties: {
        status: {
          type: Type.STRING,
          description: "Optional status filter: 'Submitted', 'Under Review', 'In Progress', or 'Resolved'",
        },
      },
    },
  };

  const getComplaintByIdDeclaration = {
    name: 'get_complaint_by_id',
    description: "Returns one complaint plus its latest timeline updates and remarks by ID, only if the user has access to it.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        id: {
          type: Type.INTEGER,
          description: 'The numeric complaint ID (e.g. 1001, 1002, 1024)',
        },
      },
      required: ['id'],
    },
  };

  const countMyComplaintsDeclaration = {
    name: 'count_my_complaints',
    description: 'Returns the total count of complaints submitted by the user, grouped by status.',
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  };

  const systemInstruction = `You are CampusVoice Assistant. Answer ONLY using data returned by tools.
If a complaint is not found or you lack data, say so clearly. Never invent complaint details or numbers.
Keep answers short, helpful, and friendly.
Always mention the complaint ID, title, current status, and the latest remark when discussing a complaint.
Current user name: ${effectiveUserName}, Role: ${effectiveRole}.`;

  const lastUserMessage = messages[messages.length - 1]?.content || '';

  // If Gemini is not configured, use an intelligent local responder matching the exact tool contract:
  if (!ai) {
    const qLower = lastUserMessage.toLowerCase();
    const idMatch = qLower.match(/#?(\d{4})/);

    if (idMatch) {
      const compId = parseInt(idMatch[1], 10);
      const resData = await execGetComplaintById(compId);
      if (resData.error) {
        return res.json({ reply: `I searched for complaint #${compId}, but ${resData.error}` });
      }
      return res.json({
        reply: `Complaint #${resData.id} ("${resData.title}") is currently **${resData.status}**. The latest remark is: "${resData.latest_remark}".`
      });
    }

    if (qLower.includes('how many') || qLower.includes('count') || qLower.includes('total')) {
      const counts = await execCountMyComplaints();
      return res.json({
        reply: `You have submitted a total of **${counts.total}** complaint(s): **${counts.pending}** pending (${counts.submitted} Submitted, ${counts.under_review} Under Review, ${counts.in_progress} In Progress) and **${counts.resolved}** Resolved.`
      });
    }

    if (qLower.includes('pending') || qLower.includes('status') || qLower.includes('my complaint') || qLower.includes('previous')) {
      const list = await execGetMyComplaints();
      if (list.length === 0) {
        return res.json({ reply: "You don't have any complaints registered in the system yet." });
      }
      const first = list[0];
      const details = await execGetComplaintById(first.id);
      return res.json({
        reply: `You currently have ${list.length} complaint(s). Your latest complaint #${details.id} ("${details.title}") is **${details.status}**. Latest update: "${details.latest_remark}".`
      });
    }

    return res.json({
      reply: `Hello ${effectiveUserName}! I am your CampusVoice Assistant. You can ask me about your submitted complaints, track a specific complaint by ID (e.g. #1001), or check pending counts.`
    });
  }

  try {
    // Convert conversation to Gemini contents
    const contents: any[] = messages.map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    // Step 1: Call Gemini with tools
    const initialResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
      config: {
        systemInstruction,
        tools: [
          {
            functionDeclarations: [
              getMyComplaintsDeclaration,
              getComplaintByIdDeclaration,
              countMyComplaintsDeclaration,
            ],
          },
        ],
      },
    });

    const functionCalls = initialResponse.functionCalls;

    if (!functionCalls || functionCalls.length === 0) {
      return res.json({ reply: initialResponse.text || "I am here to help you check your complaints. Ask me about your complaint status or provide an ID." });
    }

    // Execute functions
    const toolParts: any[] = [];
    for (const call of functionCalls) {
      let resultData: any;
      if (call.name === 'get_my_complaints') {
        const args = (call.args || {}) as { status?: string };
        resultData = await execGetMyComplaints(args.status);
      } else if (call.name === 'get_complaint_by_id') {
        const args = (call.args || {}) as { id: number };
        resultData = await execGetComplaintById(Number(args.id));
      } else if (call.name === 'count_my_complaints') {
        resultData = await execCountMyComplaints();
      } else {
        resultData = { error: 'Unknown tool' };
      }

      toolParts.push({
        functionResponse: {
          name: call.name,
          response: { result: resultData },
        },
      });
    }

    // Step 2: Feed tool output back to Gemini
    const modelTurn = initialResponse.candidates?.[0]?.content;
    const finalResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        ...contents,
        modelTurn,
        {
          role: 'user',
          parts: toolParts,
        },
      ],
      config: {
        systemInstruction,
      },
    });

    return res.json({ reply: finalResponse.text || "Here is your complaint status summary." });
  } catch (err: any) {
    console.error('Error during AI chat:', err?.message || err);

    // Graceful fallback on API error
    const compList = await execGetMyComplaints();
    if (compList.length > 0) {
      const top = compList[0];
      const details = await execGetComplaintById(top.id);
      return res.json({
        reply: `Here is your latest active complaint #${details.id} ("${details.title}"): Current status is **${details.status}**. Latest update: "${details.latest_remark}".`
      });
    }

    return res.json({
      reply: "I am having temporary trouble contacting the AI service, but you can track your complaints in the table on your portal dashboard."
    });
  }
});

// --------------------------------------------------------------------------
// Vite integration for dev server or static files in production
// --------------------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`CampusVoice server running at http://0.0.0.0:${port}`);
  });
}

startServer();

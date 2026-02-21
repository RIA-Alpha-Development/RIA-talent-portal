import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

// Initialize the Generative AI client
// The Vertex AI proxy interceptor will handle routing these calls through the backend
const genAI = new GoogleGenerativeAI(process.env.VITE_GEMINI_API_KEY || 'placeholder-key');

// Get the model instance
const getModel = (modelName: string = 'gemini-1.5-flash') => {
  return genAI.getGenerativeModel({ model: modelName });
};

export const generateJobDescription = async (prompt: string): Promise<string> => {
  try {
    const model = getModel();
    const result = await model.generateContent(
      `Generate a professional job description based on this input: ${prompt}. Include sections for Responsibilities, Requirements, and Benefits.`
    );
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating job description:', error);
    throw error;
  }
};

export const extractJobDetails = async (text: string) => {
  try {
    const model = getModel();
    const result = await model.generateContent(
      `Extract job details from the following text and return as JSON with fields: title, salaryMin, salaryMax, salaryUnit (Annually or Per Hour), type (Full-time, Part-time, Contract, Contract-to-hire, or Intern), mode (Remote, Hybrid, or On-site), description. Text: ${text}`
    );
    const response = await result.response;
    const responseText = response.text();
    // Try to parse JSON from the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Could not parse job details from response');
  } catch (error) {
    console.error('Error extracting job details:', error);
    throw error;
  }
};

export const extractCandidateDetails = async (resumeText: string) => {
  try {
    const model = getModel();
    const result = await model.generateContent(
      `You are an expert HR assistant. Extract candidate information from the following resume text into a JSON object with these fields: name, email, phone, address, summary (brief professional summary), skills (array of strings).

Resume Text:
"""
${resumeText}
"""

Return only the JSON object.`
    );
    const response = await result.response;
    const responseText = response.text();
    // Try to parse JSON from the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Could not parse candidate details from response');
  } catch (error) {
    console.error('Error extracting candidate details:', error);
    throw error;
  }
};

export const calculateMatchScore = async (resumeText: string, jobDescription: string): Promise<number> => {
  try {
    const model = getModel();
    const result = await model.generateContent(
      `You are an expert recruiter. Compare the following candidate resume to the job description provided.
Assign a quantitative suitability score from 0 to 100, where 100 is a perfect match.

Job Description:
"""
${jobDescription}
"""

Candidate Resume:
"""
${resumeText}
"""

Return only a JSON object with a "score" field containing the numeric score.`
    );
    const response = await result.response;
    const responseText = response.text();
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]).score || 0;
    }
    return 0;
  } catch (error) {
    console.error('Error calculating match score:', error);
    return 0;
  }
};

export const summarizeInterviewNotes = async (transcript: string): Promise<string> => {
  try {
    const model = getModel();
    const result = await model.generateContent(
      `You are an expert recruiter. Below is a transcript or raw notes from an interview.
Please provide a concise, professional summary of the interview.
Focus on:
1. Key strengths mentioned.
2. Potential concerns or red flags.
3. Overall recommendation.

Transcript:
"""
${transcript}
"""`
    );
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error summarizing interview notes:', error);
    throw error;
  }
};

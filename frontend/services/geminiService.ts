
import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string, vertexai: true });

export const generateJobDescription = async (prompt: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        role: 'user',
        parts: [{ text: `Generate a professional job description based on this input: ${prompt}. Include sections for Responsibilities, Requirements, and Benefits.` }]
      },
      config: {
        temperature: 0.7,
      }
    });
    return response.text;
  } catch (error) {
    console.error('Error generating job description:', error);
    throw error;
  }
};

export const extractJobDetails = async (text: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        role: 'user',
        parts: [{ text: `Extract job details from the following text: ${text}` }]
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            salaryMin: { type: Type.NUMBER },
            salaryMax: { type: Type.NUMBER },
            salaryUnit: { type: Type.STRING, description: 'One of: Annually, Per Hour' },
            type: { type: Type.STRING, description: 'One of: Full-time, Part-time, Contract, Contract-to-hire, Intern' },
            mode: { type: Type.STRING, description: 'One of: Remote, Hybrid, On-site' },
            description: { type: Type.STRING }
          },
          required: ['title', 'description']
        }
      }
    });
    return JSON.parse(response.text);
  } catch (error) {
    console.error('Error extracting job details:', error);
    throw error;
  }
};

export const extractCandidateDetails = async (resumeText: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        role: 'user',
        parts: [{ 
          text: `You are an expert HR assistant. Extract candidate information from the following resume text into a structured JSON format. 
          
          Resume Text:
          """
          ${resumeText}
          """
          
          Extract the candidate's full name, email, phone number, address, a brief professional summary, and a list of key skills.` 
        }]
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            email: { type: Type.STRING },
            phone: { type: Type.STRING },
            address: { type: Type.STRING },
            summary: { type: Type.STRING, description: 'A brief professional summary' },
            skills: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: 'List of key technical and soft skills'
            }
          },
          required: ['name', 'email']
        }
      }
    });
    
    const result = JSON.parse(response.text);
    return result;
  } catch (error) {
    console.error('Error extracting candidate details:', error);
    throw error;
  }
};

export const calculateMatchScore = async (resumeText: string, jobDescription: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        role: 'user',
        parts: [{ 
          text: `You are an expert recruiter. Compare the following candidate resume to the job description provided. 
          Assign a quantitative suitability score from 0 to 100, where 100 is a perfect match.
          
          Job Description:
          """
          ${jobDescription}
          """
          
          Candidate Resume:
          """
          ${resumeText}
          """
          
          Return only a JSON object with the score.` 
        }]
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER, description: 'Suitability percentage from 0 to 100' }
          },
          required: ['score']
        }
      }
    });
    return JSON.parse(response.text).score;
  } catch (error) {
    console.error('Error calculating match score:', error);
    return 0;
  }
};

export const summarizeInterviewNotes = async (transcript: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        role: 'user',
        parts: [{ 
          text: `You are an expert recruiter. Below is a transcript or raw notes from an interview. 
          Please provide a concise, professional summary of the interview. 
          Focus on:
          1. Key strengths mentioned.
          2. Potential concerns or red flags.
          3. Overall recommendation.
          
          Transcript:
          """
          ${transcript}
          """` 
        }]
      },
      config: {
        temperature: 0.3,
      }
    });
    return response.text;
  } catch (error) {
    console.error('Error summarizing interview notes:', error);
    throw error;
  }
};

import { ChatOpenAI } from "langchain/chat_models/openai"; 
import {
  SystemMessagePromptTemplate,
  HumanMessagePromptTemplate,
  ChatPromptTemplate,
} from "langchain/prompts";

// Constant to define the prompt for the profile, maybe this should be in a separate file?
const profilePrompt = ChatPromptTemplate.fromPromptMessages([
    SystemMessagePromptTemplate.fromTemplate(
      `
      You are a twitter user who enjoys engaging with members of the community when it interests you, you are based off the following profile:\n
      Name: {name}\n
      Occupation: {occupation}\n
      Interests: {interests}\n
      Personality: {personality}\n
      Physical appearance: {appearance}\n
      Relatives: {family}\n
      You have the following skills: {skills}\n
      Writing style: {examples}\n
      Continue this conversation as if you were always part of it, do not introduce yourself.\n
      `
    ),
    // For each message in the conversation, add a human message prompt
    ...Array.from({ length: 1 }, () =>
      HumanMessagePromptTemplate.fromTemplate(
        `{conversation}`
      )
    ),
  ]);

// Create a prompt for deciding which twitter command to use
const commandPrompt = ChatPromptTemplate.fromPromptMessages([
    SystemMessagePromptTemplate.fromTemplate(
      `
      You are an twitter user who loves engaging with members of the community, you are based off the following profile:\n
      Name: {name}\n
      Occupation: {occupation}\n
      Interests: {interests}\n
      Personality: {personality}\n
      Physical appearance: {appearance}\n
      Relatives: {family}\n
      You have the following skills: {skills}\n
      Your job is to analyse the following conversation and return the correct sequence of tasks to perform for the last entry in the conversation. Reply using only this format, explanations are not necessary:\n
      [A, B, C].
      You can use the following commands:\n
      A: Like the tweet if \n
      B: Retweet the tweet\n
      C: Reply to the tweet\n
      D: Follow the user\n
      Z: Ignore the tweet \n
      `
    ),
    // For each message in the conversation, add a human message prompt
    ...Array.from({ length: 1 }, () =>
      HumanMessagePromptTemplate.fromTemplate(
        `{conversation}`
      )
    ),
  ]);

// Function to create a response from the AI
export async function createResponse(env, tweetText, profile) {
    const chat = new ChatOpenAI({ temperature: 0.9 , openAIApiKey: env.OPENAI_API_KEY});
    const responseA = await chat.generatePrompt([
        await profilePrompt.formatPromptValue({
          name: profile.name,
          occupation: profile.occupation,
          interests: profile.interests,
          personality: profile.personality,
          appearance: profile.appearance,
          family: profile.family,
          skills: profile.skills,
          examples: profile.examples,
          conversation: tweetText
        }),
    ]);
    // Remove all text before : 
        const response = responseA.generations[0][0].text.split(":")[1];
        return response;
}

export async function decideAction(env, tweetText, profile) {
  const chat = new ChatOpenAI({ temperature: 0.9 , openAIApiKey: env.OPENAI_API_KEY});
  try{
    const responseA = await chat.generatePrompt([
        await commandPrompt.formatPromptValue({
          name: profile.name,
          occupation: profile.occupation,
          interests: profile.interests,
          personality: profile.personality,
          appearance: profile.appearance,
          family: profile.family,
          skills: profile.skills,
          conversation: tweetText
        }),
    ]);
        return responseA.generations[0][0].text;
  } catch (error) {
    console.log("Error in generating commands: "+error);
    return "Z";
  }
}
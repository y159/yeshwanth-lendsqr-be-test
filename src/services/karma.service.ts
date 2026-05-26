import axios from "axios";

export const isUserBlacklisted = async (identity: string): Promise<boolean> => {
  try {
    if (!process.env.ADJUTOR_API_KEY) {
      console.warn("Adjutor API key not configured. Skipping Karma check.");
      return false;
    }

    const response = await axios.get(
      `${process.env.ADJUTOR_BASE_URL}/verification/karma/${identity}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.ADJUTOR_API_KEY}`,
        },
      }
    );

    return response.data?.data ? true : false;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return false;
    }

    console.error("Karma blacklist check failed:", error.response?.data || error.message);
    return false;
  }
};
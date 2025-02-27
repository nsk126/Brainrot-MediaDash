"use client";

import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import * as AspectRatio from "@radix-ui/react-aspect-ratio";
import { IoIosArrowForward } from "react-icons/io";
import { useState, useEffect } from "react";

import { createClient } from '@/utils/supabase/client'
import { Query, Result } from "@/app/types";
import { useUser } from "@clerk/nextjs";

import { Database } from '@/database.types'
import { routeros } from "react-syntax-highlighter/dist/esm/styles/hljs";

type UserData = Database['public']['Tables']['mediaDash_user_data']['Row']
type Subscriptions = NonNullable<UserData['subscriptions']> // This will be string[]

export default function SearchResultsPage() {

  const { user } = useUser() // Add this to get user details from Clerk
  const supabase = createClient()
  const { query } = useParams();
  const [subscriptions, setSubscriptions] = useState<string[]>([]);
  const [result, setResult] = useState<Result[]>([]);
  const router = useRouter();

  const imdbUrl = "http://image.tmdb.org/t/p/original/";
  
  const imageUrls = [
    "https://images.unsplash.com/photo-1535025183041-0991a977e25b?w=300&dpr=2&q=80",
    "https://picsum.photos/200/300",
    "https://picsum.photos/id/237/200/300",
    "https://fastly.picsum.photos/id/39/3456/2304.jpg?hmac=cc_VPxzydwTUbGEtpsDeo2NxCkeYQrhTLqw4TFo-dIg",
    "https://picsum.photos/200/300?grayscale",
  ];
  

  const handleContentClick = (item: Result) => {
    const url = `/view-content?imageUrl=${imdbUrl +item['Poster Path']}&title=${item.Title}&creator=${item.Creator}&platform=${item.Platform}&description=${item.Reason}&ratings=${item.Ratings?.toString()}`;
    router.push(url);
  };

  const getSubscriptions = async (user_id: string) => {
    const { data, error } = await supabase
      .from('mediaDash_user_data')
      .select('subscriptions')
      .eq('user_id', user_id) as {
        data: Pick<UserData, 'subscriptions'>[] | null,
        error: any
      };
    
    if (error) {
      console.error('Error fetching subscriptions:', error);
      return [];
    }

    console.log("subscriptions:", JSON.stringify(data, null, 2));

    if(!data) {
      setSubscriptions([])
    } else {
      setSubscriptions(data?.[0]?.subscriptions || [])
    }
  };

  const getRecommendations = async (userData: Query) => {
    try {

      console.log("Sending to backend:", {
        user_id: userData.user_id,
        query: userData.query,
        subscriptions: userData.subscriptions
      });

      // 'http://127.0.0.1:8000/user_query'

      const response = await axios.post('https://api-simple.vercel.app/user_query', {
        user_id: userData.user_id,
        query: userData.query,
        subscriptions: subscriptions
      });
      setResult(response.data);
      console.log(response)
    } catch (error) {
      // Handle error
      if (axios.isAxiosError(error)) {
        console.error('Axios error:', error.message);
        // You can set an error state here to show error message to user
        // setError(error.message);
      } else {
        console.error('Unexpected error:', error);
      }
      // Set empty results or default state
      setResult([]);
    }
    
  };

  /**
   * The effect only runs when user is available
   * The effect re-runs if user changes
   * We don't try to access user.id when user is null
   */
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      try {
        // Get subscriptions first
        const { data } = await supabase
          .from('mediaDash_user_data')
          .select('subscriptions')
          .eq('user_id', user.id);
        
        const userSubscriptions = data?.[0]?.subscriptions || [];
        setSubscriptions(userSubscriptions);

        const requestBody = {
          user_id: user.id,
          query: query as string,
          subscriptions: userSubscriptions
        };

        console.log("Sending to backend: ", requestBody)
        
        // Then get recommendations using the fetched subscriptions
        const response = await axios.post('https://api-simple.vercel.app/user_query', {
          user_id: user.id,
          query: query as string,
          subscriptions: userSubscriptions
        });
        
        setResult(response.data);
      } catch (error) {
        console.error('Error:', error);
        setResult([]);
      }
    };
  
    fetchData();
  }, [user, query]); // Only depend on user and query

  return (
    <main className="px-screen-320 lg:px-screen-992 xl:px-screen-1200 2xl:px-screen-1440">
      <div className="max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto text-white">
        <div className="container mx-auto py-6">
          <h1 className="text-2xl font-bold">Search Results</h1>
          {/* <p className="mt-2">
            You searched for: <strong>{query}</strong>
          </p> */}

          <div className="mt-4">
            <p>Displaying results for "{query}"...</p>
          </div>
        </div>

        <div>
          <div className="font-bold text-xl py-3">
            Here&#39;s what we think you&#39;ll like:
          </div>
          <div className="">
          {result.slice(0, 5).map((item, index) => (
            <div key={index} className="flex justify-between items-center border-t px-6 py-6" onClick={() =>handleContentClick(item)}>
              <div className="flex items-center gap-x-6">
                <div className="w-[150px] lg:w-[180px] overflow-hidden rounded-md shadow-[0_2px_10px] shadow-blackA4">
                  <AspectRatio.Root ratio={16 / 16}>
                    <img
                      className="size-full object-cover"
                      src={imdbUrl + item['Poster Path']}
                      onError={(e) => {
                        e.currentTarget.src = imageUrls[index] || "https://picsum.photos/200/300";
                        e.currentTarget.onerror = null; // Prevents infinite loop if backup also fails
                      }}
                      alt="Content thumbnail"
                    />
                  </AspectRatio.Root>
                </div>
                <div className="space-y-4">
                  <div className="font-bold text-lg">{item.Title || 'No title'}</div>
                  <div className="font-medium text-sm">
                    {item.Creator || 'Emily Kang'}
                  </div>
                  <div className="font-medium text-sm ">{item.Platform || 'Tik Tok'}</div>
                </div>
              </div>

              <div className="cursor-pointer">
                <IoIosArrowForward />
              </div>
            </div>
          ))}
          </div>
        </div>

        <div className="my-16">
          <div className="font-medium text-base">
            Not what you were looking for?
          </div>
          <div className="font-normal text-sm">
            <span className="underline cursor-pointer">More results </span>
            or search again
          </div>
        </div>
      </div>
    </main>
  );
}
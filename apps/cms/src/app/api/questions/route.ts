import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client for Server-Side Use
// In production, use environment variables!
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy_key_for_now'
const supabase = createClient(supabaseUrl, supabaseKey)

export async function POST(request: Request) {
  try {
    const data = await request.json()
    
    // Validate required fields
    if (!data.question_body || !data.subject) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Insert into Supabase
    const { data: insertedQuestion, error } = await supabase
      .from('questions')
      .insert([
        {
          format: data.format,
          subject: data.subject,
          chapter: data.chapter,
          topic: data.topic,
          difficulty: data.difficulty,
          source_type: data.source_type,
          question_body: data.question_body,
          correct_answer: data.correct_answer,
          solution: data.solution,
          published: true // auto-publish for now
        }
      ])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data: insertedQuestion }, { status: 201 })
    
  } catch (error: any) {
    console.error('Error saving question:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ data }, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

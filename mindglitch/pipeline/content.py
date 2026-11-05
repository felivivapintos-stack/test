"""MindGlitch 30-day content: 15 Brain Bugs + 15 Study Glitches.

Every video = scenes -> beats. A beat is ONE voice-over line plus the visual
items that appear when that line starts. Items of a scene stay until the
scene ends. Timing is derived from the real audio of each line.

Item helpers:
  T(text, kind, size, anim)   kinds: head soft grad accent alert label quote body
                              anims: rise pop letters fade
  I(icon, size)               line icon, drawn on
  BAR(label, value, color, mx, unit)   animated bar with count-up
  NUM(value, suffix, label)   big count-up number
  LIST(items)                 numbered rows
"""

def T(text, kind="head", size=80, anim="rise"):
    return {"t": "text", "text": text, "kind": kind, "size": size, "anim": anim}

def I(icon, size=220):
    return {"t": "icon", "icon": icon, "size": size}

def BAR(label, value, color="accent", mx=100, unit="%"):
    return {"t": "bar", "label": label, "value": value, "color": color, "max": mx, "unit": unit}

def NUM(value, suffix="", label="", prefix=""):
    return {"t": "num", "value": value, "suffix": suffix, "label": label, "prefix": prefix}

def LIST(items):
    return {"t": "list", "items": items}

def B(vo, *items):
    return {"vo": vo, "items": list(items)}

def S(*beats):
    return {"beats": list(beats)}


# ---------------------------------------------------------------- CTA logic
COURSE = "MindGlitch Study System"

def cta(series, day, module=None):
    """Closing beat + end-card text, by day (sales phases)."""
    if series == "bb":
        if day == 5:
            return dict(vo="Hit follow for more brain bugs. And students... something big is coming this week.",
                        pill="FOLLOW FOR DAILY BRAIN BUGS", sub="STUDENTS: BIG NEWS THIS WEEK")
        if day == 7:
            return dict(vo="Hit follow for more brain bugs. And students: the MindGlitch Study System is now open. Link in bio.",
                        pill="STUDY SYSTEM IS OPEN", sub="LINK IN BIO")
        if day == 13:
            return dict(vo="Hit follow for more brain bugs.", pill="FOLLOW FOR DAILY BRAIN BUGS",
                        sub="FOUNDING PRICE ENDS TOMORROW - LINK IN BIO")
        if day >= 9:
            return dict(vo="Hit follow for more brain bugs.", pill="FOLLOW FOR DAILY BRAIN BUGS",
                        sub="STUDY COURSE: LINK IN BIO")
        return dict(vo="Hit follow for a new brain bug every day.", pill="FOLLOW FOR DAILY BRAIN BUGS", sub="")
    # study glitches
    if day <= 4:
        return dict(vo="Hit follow for more study glitches.", pill="FOLLOW FOR MORE STUDY GLITCHES", sub="")
    if day == 6:
        return dict(vo="Follow so you don't miss it.", pill="OPENS TOMORROW", sub="LINK IN BIO")
    if day == 14:
        return dict(vo=f"This is module {module} of the MindGlitch Study System. The founding price ends today. Link in bio.",
                    pill="FOUNDING PRICE ENDS TODAY", sub=f"MODULE {module} - LINK IN BIO")
    if day == 30:
        return dict(vo="That's thirty days of study glitches. The full system, step by step, is in the course. Link in bio.",
                    pill="THE FULL SYSTEM: LINK IN BIO", sub="MINDGLITCH STUDY SYSTEM")
    return dict(vo=f"This is module {module} of the MindGlitch Study System. Link in bio.",
                pill="STUDY SYSTEM - LINK IN BIO", sub=f"MODULE {module}")


# ------------------------------------------------------------------ BRAIN BUGS
BB = [
dict(num=1, day=1, slug="spotlight-effect", title="The Spotlight Effect",
     sources=["Gilovich, Medvec & Savitsky (2000), J. Personality & Social Psychology"],
     scenes=[
  S(B("You walk into a room, and you're sure everyone noticed.",
      T("You think", "soft", 64), T("EVERYONE", "grad", 150, "letters"), T("noticed.", "head", 96), I("eye", 200)),
    B("They didn't.", T("They didn't.", "accent", 120, "pop"))),
  S(B("It's called the spotlight effect.",
      T("It's called the", "soft", 56), T("SPOTLIGHT", "grad", 140, "letters"), T("EFFECT", "head", 140, "letters"), I("spotlight", 300)),
    B("We think people notice us way more than they actually do.",
      T("We think people notice us WAY more than they do.", "body", 48))),
  S(B("In a Cornell study, students had to wear an embarrassing T-shirt into a room full of people.",
      T("CORNELL STUDY - 2000", "label", 34), T("Students wore an embarrassing T-shirt into a room full of people.", "head", 58), I("shirt", 230))),
  S(B("They guessed about half the room would notice.",
      T("How many noticed?", "head", 64), BAR("THEY GUESSED", 50, "c2")),
    B("The real number? Only about one in four.",
      BAR("ACTUALLY NOTICED", 23, "accent"))),
  S(B("Because everyone else is too busy worrying about their own spotlight.",
      T("Everyone is too busy worrying about", "soft", 56), T("their OWN spotlight.", "grad", 90, "pop"), I("people", 300)),
    B("So go wear the shirt.", T("So go wear the shirt.", "accent", 84, "pop"))),
]),
dict(num=2, day=3, slug="3am-cringe", title="Why You Cringe at 3AM",
     sources=["McGaugh (2004), Annual Review of Neuroscience - emotional memory",
              "Savitsky, Epley & Gilovich (2001), J. Personality & Social Psychology"],
     scenes=[
  S(B("It's three A.M., and your brain decides to replay something embarrassing you did years ago.",
      T("3:00 AM", "grad", 170, "letters"), I("moon", 220), T("Your brain: \"Remember that thing you said?\"", "soft", 52))),
  S(B("That's not random. Emotional moments get stored more strongly than ordinary ones.",
      T("Emotional memories", "head", 72), T("are stored STRONGER", "grad", 86), I("brain", 230)),
    B("Your brain tags them as important, so they come back more easily.",
      T("Your brain tags them: IMPORTANT.", "body", 48))),
  S(B("And at night, with no distractions, there's nothing to interrupt the replay.",
      I("moon", 200), T("No distractions", "head", 80), T("= more replay.", "grad", 80))),
  S(B("Here's the good news. Research shows we overestimate how harshly other people judge our mistakes.",
      T("SAVITSKY, EPLEY & GILOVICH - 2001", "label", 32), T("We overestimate how harshly others judge our mistakes.", "head", 60)),
    B("That moment you still cringe about? Most people barely remember it.",
      T("They barely remember it.", "accent", 84, "pop"))),
]),
dict(num=3, day=5, slug="invisible-gorilla", title="The Invisible Gorilla",
     sources=["Simons & Chabris (1999), Perception"],
     scenes=[
  S(B("Watch a video and count how many times the players in white pass the ball.",
      I("ball", 230), T("Count the passes.", "head", 92), T("(players in white)", "soft", 50))),
  S(B("Halfway through, a person in a gorilla suit walks right through the middle of the game.",
      T("Then a", "soft", 60), T("GORILLA", "grad", 160, "letters"), T("walks right through the scene.", "head", 60)),
    B("About half the people watching never see it.",
      T("1 in 2", "accent", 170, "pop"), T("never saw it.", "head", 72))),
  S(B("It's called inattentional blindness.",
      T("It's called", "soft", 56), T("INATTENTIONAL", "grad", 104, "letters"), T("BLINDNESS", "head", 124, "letters")),
    B("When your attention is locked on one thing, your brain can filter out everything else.",
      I("eye", 200), T("Locked on one thing = blind to the rest.", "body", 48))),
  S(B("Great for focus... terrible when you're looking for your keys.",
      T("Great for focus.", "grad", 84), T("Terrible for finding your keys.", "head", 64))),
]),
dict(num=4, day=7, slug="door-study", title="The Door Study",
     sources=["Simons & Levin (1998), Psychonomic Bulletin & Review"],
     scenes=[
  S(B("A stranger stops you on the street to ask for directions.",
      I("person", 220), T("A stranger asks you for directions.", "head", 66)),
    B("Mid-conversation, two workers carry a door right between you.",
      I("door", 200), T("Two workers carry a DOOR between you.", "head", 60)),
    B("Behind the door, the stranger is swapped for a completely different person.",
      T("The stranger is", "soft", 56), T("SWAPPED.", "grad", 130, "pop"))),
  S(B("Would you notice? In this real experiment, nearly half the people didn't.",
      T("SIMONS & LEVIN - 1998", "label", 34), T("Nearly half", "grad", 140, "pop"), T("didn't notice.", "head", 84))),
  S(B("It's called change blindness.",
      T("CHANGE", "grad", 150, "letters"), T("BLINDNESS", "head", 140, "letters")),
    B("Your brain doesn't record every detail. It saves the gist, and fills in the rest.",
      I("brain", 210), T("Your brain saves the gist, not the details.", "body", 48))),
]),
dict(num=5, day=9, slug="peak-end-rule", title="The Peak-End Rule",
     sources=["Kahneman, Fredrickson, Schreiber & Redelmeier (1993), Psychological Science"],
     scenes=[
  S(B("Would you rather keep your hand in painfully cold water for sixty seconds... or for ninety?",
      I("thermometer", 210), T("60 seconds", "head", 100), T("or", "soft", 56), T("90 seconds?", "grad", 110))),
  S(B("In a famous experiment, people did both.",
      T("KAHNEMAN ET AL. - 1993", "label", 34), T("People did both.", "head", 80)),
    B("The longer trial had the same sixty seconds, plus thirty more where the water got slightly less cold.",
      T("Same 60 s of cold...", "head", 64), T("+ 30 s slightly less cold", "grad", 66))),
  S(B("When asked which one they'd repeat, about seven out of ten picked the longer one. More total pain.",
      T("7 in 10 chose", "soft", 64), T("the LONGER one.", "grad", 100, "pop"), T("(more total pain)", "body", 46))),
  S(B("It's the peak-end rule. We don't remember experiences by their total. We remember the peak, and the ending.",
      T("PEAK-END", "grad", 140, "letters"), T("RULE", "head", 140), T("We remember the peak and the ending.", "body", 48)),
    B("So end things well. Holidays, dates, even study sessions.",
      T("So end things well.", "accent", 90, "pop"))),
]),
dict(num=6, day=11, slug="anchoring", title="Anchoring",
     sources=["Tversky & Kahneman (1974), Science"],
     scenes=[
  S(B("Researchers spun a wheel of fortune in front of people. It was rigged to land on ten, or sixty-five.",
      I("wheel", 230), T("A rigged wheel lands on", "soft", 56), T("10 or 65", "grad", 130, "pop"))),
  S(B("Then they asked: what percentage of African countries are in the United Nations?",
      T("Then:", "soft", 56), T("\"What % of African countries are in the UN?\"", "head", 64))),
  S(B("People who saw ten guessed twenty-five percent.",
      T("TVERSKY & KAHNEMAN - 1974", "label", 34), T("Average guess", "head", 64), BAR("SAW 10", 25, "c2")),
    B("People who saw sixty-five guessed forty-five.",
      BAR("SAW 65", 45, "accent"))),
  S(B("A random number changed their answer. That's anchoring. The first number you see drags your judgment toward it.",
      T("ANCHORING", "grad", 140, "letters"), T("The first number you see drags your guess.", "body", 48)),
    B("It's why the original price is always shown next to the sale price.",
      T("\"Was $199\"?", "accent", 100, "pop"), T("That's an anchor.", "head", 70))),
]),
dict(num=7, day=13, slug="doorway-effect", title="The Doorway Effect",
     sources=["Radvansky, Krawietz & Tamplin (2011), Quarterly J. of Experimental Psychology",
              "Godden & Baddeley (1975), British J. of Psychology - context-dependent memory"],
     scenes=[
  S(B("You walk into the kitchen... and forget why you came.",
      I("door", 220), T("Walked in.", "head", 96), T("Forgot why.", "grad", 120, "pop"))),
  S(B("It might be the doorway effect. In experiments, walking through a doorway made people forget more than walking the same distance inside one room.",
      T("RADVANSKY ET AL. - 2011", "label", 34), T("Walking through a DOOR made people forget more.", "head", 62))),
  S(B("Your brain treats a doorway like the end of a scene. It files the old room away... and your plan goes with it.",
      T("Doorway = \"new scene\"", "grad", 86), I("brain", 210), T("The old room gets filed away.", "body", 48))),
  S(B("The fix? Go back to where you were. The context brings the memory back.",
      T("The fix: go back.", "accent", 96, "pop"), T("Context brings the memory back.", "body", 48))),
]),
dict(num=8, day=15, slug="ikea-effect", title="The IKEA Effect",
     sources=["Norton, Mochon & Ariely (2012), J. of Consumer Psychology"],
     scenes=[
  S(B("Why does furniture you built yourself feel more valuable, even when it's a little wonky?",
      I("box", 230), T("Built it yourself?", "head", 90), T("It feels worth MORE.", "grad", 90))),
  S(B("In one study, people who assembled a simple IKEA storage box were willing to pay sixty-three percent more for it than for one that was already built.",
      T("NORTON, MOCHON & ARIELY - 2012", "label", 32), NUM(63, "%", "MORE THEY WOULD PAY", "+"))),
  S(B("It's called the IKEA effect. Effort makes us love the result.",
      T("THE IKEA", "grad", 120, "letters"), T("EFFECT", "head", 130, "letters"), T("Effort makes us love the result.", "body", 50))),
  S(B("Which is good news. What you learn the hard way, you value more.",
      T("Learned the hard way?", "head", 72), T("Valued more.", "accent", 100, "pop"))),
]),
dict(num=9, day=17, slug="illusion-of-transparency", title="The Illusion of Transparency",
     sources=["Gilovich, Savitsky & Medvec (1998), J. Personality & Social Psychology",
              "Savitsky & Gilovich (2003), J. of Experimental Social Psychology"],
     scenes=[
  S(B("You're giving a presentation, and you're sure everyone can see how nervous you are.",
      I("face", 220), T("Your nerves feel", "soft", 60), T("OBVIOUS.", "grad", 130, "pop"))),
  S(B("Researchers tested this. Speakers thought their nerves were clearly visible. The audience barely noticed.",
      T("GILOVICH, SAVITSKY & MEDVEC - 1998", "label", 30), T("Speakers: \"They can tell.\"", "head", 62), T("Audience: \"Seemed fine.\"", "grad", 70))),
  S(B("It's the illusion of transparency. Your feelings are loud on the inside, and mostly invisible from the outside.",
      T("ILLUSION OF", "head", 100), T("TRANSPARENCY", "grad", 110, "letters"), T("Loud inside. Invisible outside.", "body", 50))),
  S(B("And the twist: in a follow-up study, simply telling speakers about this effect made them calmer, and their talks were rated better.",
      T("SAVITSKY & GILOVICH - 2003", "label", 34), T("Knowing this made speakers calmer AND better.", "head", 62)),
    B("So now you know.", T("So now you know.", "accent", 100, "pop"))),
]),
dict(num=10, day=19, slug="frequency-illusion", title="The Frequency Illusion",
     sources=["Zwicky (2005), Language Log - coined 'frequency illusion'"],
     scenes=[
  S(B("You learn a new word, or notice a new car model... and suddenly it's everywhere.",
      I("car", 240), T("Suddenly, it's", "soft", 60), T("EVERYWHERE.", "grad", 130, "pop"))),
  S(B("It's not the universe sending you signs. It's the frequency illusion, also called the Baader-Meinhof phenomenon.",
      T("FREQUENCY", "grad", 130, "letters"), T("ILLUSION", "head", 130, "letters"), T("a.k.a. Baader-Meinhof", "body", 48))),
  S(B("Two things happen. Your attention starts picking it out.",
      LIST(["Your attention starts picking it out", "Every sighting feels like proof"])),
    B("And every time you spot it, it feels like proof.")),
  S(B("It was there all along. Your brain just stopped filtering it out.",
      T("It was always there.", "accent", 92, "pop"), T("Your brain stopped filtering it out.", "body", 48))),
]),
dict(num=11, day=21, slug="bystander-effect", title="The Bystander Effect (and the Twist)",
     sources=["Darley & Latane (1968), J. Personality & Social Psychology",
              "Philpot, Liebst, Levine, Bernasco & Lindegaard (2020), American Psychologist"],
     scenes=[
  S(B("In a classic experiment, students heard someone having a seizure over an intercom.",
      T("DARLEY & LATANE - 1968", "label", 34), I("ear", 210), T("Someone has a seizure over the intercom.", "head", 62))),
  S(B("When people thought they were alone, eighty-five percent went to help.",
      T("Who went to help?", "head", 64), BAR("ALONE", 85, "accent")),
    B("When they thought four others could hear it too, only thirty-one percent did.",
      BAR("WITH 4 OTHERS", 31, "alert"))),
  S(B("That's the bystander effect. Everyone assumes someone else will act.",
      T("THE BYSTANDER", "grad", 104, "letters"), T("EFFECT", "head", 130, "letters"), T("Everyone waits for someone else.", "body", 50))),
  S(B("But here's the twist. A 2020 study analyzed real CCTV footage of public conflicts. In nine out of ten, at least one bystander stepped in.",
      T("PHILPOT ET AL. - 2020", "label", 34), T("9 in 10", "grad", 170, "pop"), T("real conflicts: someone stepped in.", "head", 56)),
    B("So be the one who goes first.", T("Be the one who goes first.", "accent", 76, "pop"))),
]),
dict(num=12, day=23, slug="loss-aversion", title="Loss Aversion",
     sources=["Kahneman & Tversky (1979), Econometrica",
              "Tversky & Kahneman (1992), J. of Risk and Uncertainty"],
     scenes=[
  S(B("Would you take this bet? Flip a coin. Heads, you win one hundred and ten dollars. Tails, you lose one hundred.",
      T("HEADS: +$110", "grad", 104), T("TAILS: -$100", "alert", 104))),
  S(B("On paper, it's a good deal. But most people say no.",
      T("Good deal on paper.", "head", 70), T("Most say NO.", "accent", 120, "pop"))),
  S(B("It's loss aversion. Research suggests a loss hurts roughly twice as much as an equal gain feels good.",
      T("KAHNEMAN & TVERSKY - 1979", "label", 34), T("LOSS", "grad", 150, "letters"), T("AVERSION", "head", 130, "letters"),
      T("A loss hurts ~2x more than a gain feels good.", "body", 46))),
  S(B("It's why apps say: don't lose your streak.",
      T("\"Don't lose your streak!\"", "accent", 80, "pop"), T("Now you know why.", "head", 64))),
]),
dict(num=13, day=25, slug="mere-exposure", title="The Mere Exposure Effect",
     sources=["Zajonc (1968), J. Personality & Social Psychology"],
     scenes=[
  S(B("Why does a song you couldn't stand slowly become one you love?",
      I("music", 220), T("Hated it.", "head", 96), T("Now you love it?", "grad", 100))),
  S(B("In 1968, psychologist Robert Zajonc showed people made-up words and symbols. The more often they saw one, the more they liked it.",
      T("ZAJONC - 1968", "label", 34), T("Seen more", "head", 100), T("= liked more.", "grad", 100, "pop"))),
  S(B("It's the mere exposure effect. Familiar feels safe, and safe feels good.",
      T("MERE", "grad", 140, "letters"), T("EXPOSURE", "head", 130, "letters"), T("Familiar feels safe. Safe feels good.", "body", 48))),
  S(B("Which is why you see the same ad twenty times.",
      T("Seen this ad 20 times?", "accent", 80, "pop"), T("That's on purpose.", "head", 66))),
]),
dict(num=14, day=27, slug="hindsight-bias", title="Hindsight Bias",
     sources=["Fischhoff (1975), J. of Experimental Psychology: Human Perception and Performance"],
     scenes=[
  S(B("I knew it all along. Did you, though?",
      T("\"I knew it all along.\"", "grad", 92), T("Did you, though?", "soft", 60))),
  S(B("In a classic study, people read about a historical event, and some were told how it ended.",
      T("FISCHHOFF - 1975", "label", 34), T("Some people were told how a historical event ended.", "head", 60))),
  S(B("Knowing the ending made them rate that outcome as more likely... and they didn't realize it.",
      T("Knowing the ending", "head", 72), T("made it look OBVIOUS.", "grad", 90, "pop"))),
  S(B("It's hindsight bias. Once you know the answer, your brain rewrites how hard it was to see.",
      T("HINDSIGHT", "grad", 140, "letters"), T("BIAS", "head", 140), T("Your brain rewrites the past.", "body", 50)),
    B("It's also why exam answers look easy once you've seen them.",
      T("Answers look easy AFTER you see them.", "accent", 64, "pop"))),
]),
dict(num=15, day=29, slug="cocktail-party-effect", title="The Cocktail Party Effect",
     sources=["Cherry (1953), J. of the Acoustical Society of America",
              "Wood & Cowan (1995), J. of Experimental Psychology: Learning, Memory, and Cognition"],
     scenes=[
  S(B("You're at a loud party, ignoring a dozen conversations.",
      I("ear", 220), T("Loud room.", "head", 96), T("A dozen conversations.", "body", 52)),
    B("Then someone across the room says your name, and you hear it instantly.",
      T("Then: YOUR NAME.", "grad", 100, "pop"))),
  S(B("It's the cocktail party effect. Your brain keeps monitoring the sounds you're ignoring, waiting for something important.",
      T("THE COCKTAIL", "grad", 104, "letters"), T("PARTY EFFECT", "head", 104, "letters"), T("Your brain keeps listening in the background.", "body", 46))),
  S(B("In one experiment, people repeated a message heard in one ear, while their name was played in the other. About a third noticed it.",
      T("WOOD & COWAN - 1995", "label", 34), T("1 in 3", "grad", 170, "pop"), T("heard their name in the \"ignored\" ear.", "head", 54))),
  S(B("To your brain, your name is one of the most important sounds there is. So use people's names.",
      T("Use people's names.", "accent", 90, "pop"))),
]),
]

# --------------------------------------------------------------- STUDY GLITCHES
SG = [
dict(num=1, day=2, module=1, slug="rereading-trap", title="Rereading Is a Trap",
     sources=["Roediger & Karpicke (2006), Psychological Science"],
     scenes=[
  S(B("Rereading your notes feels like studying.",
      I("notes", 220), T("Rereading feels like", "soft", 60), T("STUDYING", "grad", 150, "letters")),
    B("It's not.", T("IT'S NOT.", "alert", 140, "pop"))),
  S(B("It's a study glitch called the fluency illusion. The page looks familiar, so your brain thinks: I know this.",
      T("THE FLUENCY", "grad", 104, "letters"), T("ILLUSION", "head", 124, "letters"), I("brain", 200), T("\"I know this.\"", "quote", 70))),
  S(B("But recognizing is not remembering.",
      T("RECOGNIZING", "soft", 104), T("is NOT", "alert", 84, "pop"), T("REMEMBERING", "grad", 104, "pop"))),
  S(B("In a 2006 study, students who just reread remembered forty-two percent a week later.",
      T("ROEDIGER & KARPICKE - 2006", "label", 34), T("Remembered a week later", "head", 62), BAR("JUST REREAD", 42, "c2")),
    B("Students who tested themselves: fifty-six.",
      BAR("TESTED THEMSELVES", 56, "accent"))),
  S(B("So close the book, and ask: what do I actually remember? That struggle is the learning.",
      T("Close the book.", "head", 96), T("\"What do I actually remember?\"", "quote", 72), T("The struggle IS the learning.", "body", 50))),
]),
dict(num=2, day=4, module=1, slug="forgetting-curve", title="The Forgetting Curve",
     sources=["Ebbinghaus (1885), Memory: A Contribution to Experimental Psychology",
              "Murre & Dros (2015), PLOS ONE - replication"],
     scenes=[
  S(B("You study for hours, and a week later, most of it is gone.",
      T("Studied for hours.", "head", 84), T("A week later: gone.", "grad", 96, "pop"))),
  S(B("In 1885, Hermann Ebbinghaus measured his own forgetting. The steepest drop happened in the first day.",
      T("EBBINGHAUS - 1885", "label", 34), I("curve", 420), T("The steepest drop: the first 24 hours.", "body", 48)),
    B("And a 2015 replication found almost the same curve.",
      T("Replicated in 2015.", "head", 60))),
  S(B("The fix isn't studying longer. It's reviewing at the right moments, just before you forget.",
      T("Not longer.", "alert", 100, "pop"), T("Review just before you forget.", "grad", 80))),
  S(B("Each review resets the curve, and it gets flatter every time. That's spaced repetition.",
      I("calendar", 220), T("Every review = a flatter curve.", "head", 62), T("SPACED REPETITION", "grad", 90, "pop"))),
]),
dict(num=3, day=6, module=4, slug="memory-palace", title="The Memory Palace",
     sources=["Dresler et al. (2017), Neuron"],
     scenes=[
  S(B("Memory champions can memorize a shuffled deck of cards in under a minute.",
      I("cards", 220), T("A whole deck.", "head", 90), T("Under 1 minute.", "grad", 104, "pop")),
    B("Their secret is more than two thousand years old.",
      T("A 2,000-year-old trick.", "body", 52))),
  S(B("It's called the memory palace. Picture a place you know well, like your home, and put each thing you want to remember along a route through it.",
      I("palace", 240), T("THE MEMORY", "grad", 110, "letters"), T("PALACE", "head", 150, "letters"), T("Your home + a route + vivid images.", "body", 48))),
  S(B("In a 2017 study, ordinary people trained this for six weeks. Before, they remembered about twenty-six words from a list.",
      T("DRESLER ET AL. - 2017", "label", 34), T("Words remembered from a list of 72", "head", 56), BAR("BEFORE", 26, "c2", 72, "")),
    B("After: about sixty-two. And four months later, the boost was still there.",
      BAR("AFTER 6 WEEKS", 62, "accent", 72, ""), T("Still there 4 months later.", "body", 48))),
  S(B("I'm building a full course on this, and on every study method that actually has evidence behind it. Doors open tomorrow.",
      T("NEW COURSE", "label", 34), T("The MindGlitch", "head", 84), T("Study System", "grad", 110, "pop"), T("Opens tomorrow.", "accent", 72))),
]),
dict(num=4, day=8, module=3, slug="spacing-vs-cramming", title="Spacing Beats Cramming",
     sources=["Cepeda, Pashler, Vul, Wixted & Rohrer (2006), Psychological Bulletin"],
     scenes=[
  S(B("Cramming the night before feels productive. And it works... for about one test.",
      I("moon", 210), T("Cramming", "head", 100), T("works for ONE test.", "grad", 90, "pop"))),
  S(B("A huge review of more than three hundred experiments found the same thing again and again.",
      T("CEPEDA ET AL. - 2006", "label", 34), NUM(317, "", "EXPERIMENTS REVIEWED")),
    B("Spreading your study over several days beats cramming the same hours into one.",
      T("Same hours, spread out", "head", 64), T("= remembered longer.", "grad", 80))),
  S(B("So instead of five hours on Sunday, try one hour a day, five days in a row.",
      T("5 h on Sunday", "alert", 84), T("vs", "soft", 56), T("1 h x 5 days", "grad", 110, "pop"))),
  S(B("Same effort. Way more stays in your head.",
      T("Same effort.", "head", 90), T("Way more stays.", "accent", 96, "pop"))),
]),
dict(num=5, day=10, module=2, slug="highlighting-myth", title="Highlighting Doesn't Work",
     sources=["Dunlosky, Rawson, Marsh, Nathan & Willingham (2013), Psychological Science in the Public Interest"],
     scenes=[
  S(B("Your notes look like a rainbow. Every line highlighted.",
      I("highlighter", 220), T("Everything", "head", 100), T("highlighted?", "grad", 110, "pop"))),
  S(B("A major review of ten popular study techniques rated highlighting as low utility. And rereading got the same low rating.",
      T("DUNLOSKY ET AL. - 2013", "label", 34), T("Highlighting:", "head", 76), T("LOW UTILITY", "alert", 116, "pop"), T("Rereading: low utility, too.", "body", 48))),
  S(B("The two rated highest? Practice testing, and spreading your study over time.",
      T("Rated HIGH utility:", "soft", 58), LIST(["Practice testing", "Spaced practice"]))),
  S(B("Highlighting feels like work, but your brain is mostly coloring. Turn each highlight into a question instead.",
      T("Turn highlights into", "head", 66), T("QUESTIONS.", "grad", 120, "pop"), T("\"What are the 3 causes of...?\"", "quote", 54))),
]),
dict(num=6, day=12, module=1, slug="learning-styles-myth", title="The Learning Styles Myth",
     sources=["Pashler, McDaniel, Rohrer & Bjork (2008), Psychological Science in the Public Interest"],
     scenes=[
  S(B("Are you a visual learner? Auditory? Kinesthetic?",
      T("Visual?", "head", 100), T("Auditory?", "head", 100), T("Kinesthetic?", "grad", 100))),
  S(B("Here's the uncomfortable truth. There's no good evidence that matching lessons to your learning style helps you learn.",
      T("No good evidence", "alert", 96, "pop"), T("that matching your \"style\" helps.", "head", 60))),
  S(B("A 2008 review searched for it, and found no adequate support.",
      T("PASHLER ET AL. - 2008", "label", 34), I("question", 210), T("No adequate support.", "grad", 86))),
  S(B("What does work? Matching the method to the material. Diagrams for structures. Practice problems for math. And testing yourself, for everything.",
      T("Match the method to the MATERIAL:", "head", 56),
      LIST(["Diagrams for structures", "Problems for math", "Self-testing for everything"]))),
]),
dict(num=7, day=14, module=6, slug="interleaving", title="Interleaving",
     sources=["Rohrer & Taylor (2007), Instructional Science"],
     scenes=[
  S(B("Most textbooks have you practice one type of problem over and over, in a block.",
      T("A A A A  B B B B", "head", 96, "letters"), T("Blocked practice", "body", 52))),
  S(B("Mixing types together feels harder... and works better. It's called interleaving.",
      T("A B C B A C", "grad", 110, "letters"), T("INTERLEAVING", "head", 110, "pop"))),
  S(B("In a 2007 study, students who practiced math problems in blocks scored twenty percent on a test a week later.",
      T("ROHRER & TAYLOR - 2007", "label", 34), T("Test score, one week later", "head", 60), BAR("BLOCKED", 20, "c2")),
    B("Students who mixed them: sixty-three percent.",
      BAR("MIXED", 63, "accent"))),
  S(B("Mixing forces your brain to choose which method to use. And that's exactly what the exam asks you to do.",
      T("Mixing trains you to CHOOSE the method.", "head", 62), T("Just like the exam.", "grad", 84, "pop"))),
]),
dict(num=8, day=16, module=2, slug="pretesting", title="Test Yourself Before You Study",
     sources=["Richland, Kornell & Kao (2009), J. of Experimental Psychology: Applied"],
     scenes=[
  S(B("Want to learn something faster? Take the test before you study.",
      I("question", 220), T("Take the test", "head", 90), T("BEFORE you study.", "grad", 96, "pop"))),
  S(B("Even when you get the answers wrong, guessing first makes the material stick better when you learn it.",
      T("Wrong guesses", "head", 90), T("still help.", "grad", 100, "pop"))),
  S(B("Researchers found that even unsuccessful attempts to answer boosted later learning.",
      T("RICHLAND, KORNELL & KAO - 2009", "label", 32), T("Failed attempts boosted learning.", "head", 66))),
  S(B("Guessing opens a question in your brain, so the right answer has somewhere to land. Before your next lecture, try the end-of-chapter questions first.",
      I("brain", 200), T("Before class:", "head", 72), T("try the questions FIRST.", "accent", 80, "pop"))),
]),
dict(num=9, day=18, module=2, slug="protege-effect", title="Learn It Like You Have to Teach It",
     sources=["Nestojko, Bui, Kornell & Bjork (2014), Memory & Cognition"],
     scenes=[
  S(B("The fastest way to learn something? Study it like you're going to teach it.",
      I("teach", 230), T("Study it like", "soft", 62), T("you'll TEACH it.", "grad", 104, "pop"))),
  S(B("In a 2014 study, students who expected to teach the material remembered more, and organized it better, than students who expected a test. Even though no one actually taught.",
      T("NESTOJKO ET AL. - 2014", "label", 34), T("Expecting to teach", "head", 72), T("= remembered more.", "grad", 84))),
  S(B("When you plan to teach, you look for structure. What's the main idea? What connects to what?",
      LIST(["What's the main idea?", "What connects to what?", "How would I explain it?"]))),
  S(B("So after studying, explain it out loud to an imaginary student. Where you get stuck is exactly what you need to review.",
      T("Explain it out loud.", "grad", 86, "pop"), T("Where you get stuck = what to review.", "body", 48))),
]),
dict(num=10, day=20, module=5, slug="laptop-multitasking", title="Distraction Is Contagious",
     sources=["Sana, Weston & Cepeda (2013), Computers & Education"],
     scenes=[
  S(B("Open another tab during class? Just for a second?",
      I("laptop", 240), T("Just one tab...", "head", 90))),
  S(B("In a 2013 study, students who multitasked on a laptop during a lecture scored eleven percent lower on a test.",
      T("SANA, WESTON & CEPEDA - 2013", "label", 32), NUM(11, "%", "LOWER: THE MULTITASKERS", "-"))),
  S(B("But the shocking part? Students who just sat where they could see a multitasker's screen scored seventeen percent lower.",
      T("Just SEEING their screen:", "head", 62), NUM(17, "%", "LOWER: THE PEOPLE NEARBY", "-"))),
  S(B("Distraction is contagious. Close the tabs, and sit where other screens can't pull you in.",
      T("Distraction is", "head", 80), T("CONTAGIOUS.", "grad", 110, "pop"), T("Close the tabs.", "accent", 72))),
]),
dict(num=11, day=22, module=6, slug="sleep-after-studying", title="Sleep Is Part of Studying",
     sources=["Gais, Lucas & Born (2006), Learning & Memory"],
     scenes=[
  S(B("The best thing to do after studying might be... sleep.",
      I("moon", 220), T("After studying:", "head", 76), T("SLEEP.", "grad", 150, "pop"))),
  S(B("During sleep, your brain replays and strengthens what you learned that day.",
      I("brain", 220), T("Sleep replays and strengthens memories.", "head", 60))),
  S(B("In one study, people who learned vocabulary in the evening and then slept remembered more than people who learned in the morning and stayed awake.",
      T("GAIS, LUCAS & BORN - 2006", "label", 34), T("Learn, then sleep", "grad", 90), T("beat learn, then stay awake.", "head", 58))),
  S(B("So an all-nighter is a trade. More hours studied, less of it kept. Review in the evening, then go to bed.",
      T("All-nighter: more hours, less kept.", "alert", 60), T("Review. Then sleep.", "accent", 92, "pop"))),
]),
dict(num=12, day=24, module=4, slug="working-memory-chunks", title="Your Brain Holds About 4 Things",
     sources=["Cowan (2001), Behavioral and Brain Sciences"],
     scenes=[
  S(B("You've probably heard your brain can hold seven things at once. It's probably closer to four.",
      T("Not 7.", "alert", 120), T("About 4.", "grad", 160, "pop"))),
  S(B("A 2001 review argued that working memory holds about four chunks of information at a time.",
      T("COWAN - 2001", "label", 34), I("blocks", 220), T("~4 chunks at a time.", "head", 74))),
  S(B("The trick is making each chunk bigger. Try to remember this: F, B, I, C, I, A, U, S, A. Nine letters.",
      T("F B I C I A U S A", "head", 84, "letters"), T("9 letters", "body", 50)),
    B("Now: FBI, CIA, USA. Just three chunks.",
      T("FBI  CIA  USA", "grad", 110, "pop"), T("3 chunks", "body", 50))),
  S(B("Experts don't have bigger memories. They have bigger chunks. That's why understanding comes before memorizing.",
      T("Experts have bigger", "head", 74), T("CHUNKS.", "grad", 130, "pop"), T("Understand first. Memorize second.", "body", 48))),
]),
dict(num=13, day=26, module=5, slug="lyrics-while-studying", title="Music While Studying: Watch the Lyrics",
     sources=["Perham & Currie (2014), Applied Cognitive Psychology"],
     scenes=[
  S(B("Studying with music? It depends on one thing: lyrics.",
      I("music", 220), T("Music while studying?", "head", 72), T("Watch the LYRICS.", "grad", 96, "pop"))),
  S(B("In a 2014 study, people did reading tests in silence, with instrumental music, or with songs with lyrics.",
      T("PERHAM & CURRIE - 2014", "label", 34), LIST(["Silence", "Instrumental", "Songs with lyrics"]))),
  S(B("The lyrics group did worse on reading comprehension. Even when they liked the song.",
      T("Lyrics = worse comprehension.", "alert", 70, "pop"), T("Even with songs they liked.", "body", 50))),
  S(B("Words compete with words. For reading and writing, go silent, or instrumental.",
      T("Words compete with words.", "grad", 84), T("Read in silence or instrumental.", "head", 58))),
]),
dict(num=14, day=28, module=2, slug="generation-effect", title="The Generation Effect",
     sources=["Slamecka & Graf (1978), J. of Experimental Psychology: Human Learning and Memory"],
     scenes=[
  S(B("What do you remember better? A word you read, or a word you figured out yourself?",
      T("Read it", "head", 100), T("or", "soft", 56), T("figure it out?", "grad", 104, "pop"))),
  S(B("In 1978, researchers found that words people generated themselves, even from a simple clue, were remembered better than words they just read.",
      T("SLAMECKA & GRAF - 1978", "label", 34), T("HOT - C _ _ _", "head", 96, "letters"), T("COLD", "grad", 130, "pop"))),
  S(B("It's the generation effect. Producing an answer beats receiving one.",
      T("THE GENERATION", "grad", 104, "letters"), T("EFFECT", "head", 130, "letters"), T("Produce it. Don't just receive it.", "body", 48))),
  S(B("So cover the answer. Fill in the blanks. And make your own flashcards, instead of downloading someone else's.",
      LIST(["Cover the answer", "Fill in the blanks", "Make your OWN flashcards"]))),
]),
dict(num=15, day=30, module=6, slug="exam-anxiety-writing", title="Write Down Your Worries Before an Exam",
     sources=["Ramirez & Beilock (2011), Science"],
     scenes=[
  S(B("Your exam starts in ten minutes, and your mind is racing.",
      I("pen", 220), T("Exam in 10 minutes.", "head", 80), T("Mind racing.", "grad", 100, "pop"))),
  S(B("Try this. Spend those ten minutes writing down exactly what you're worried about.",
      T("Write down", "head", 90), T("your worries.", "grad", 100, "pop"), T("10 minutes. Right before the exam.", "body", 48))),
  S(B("In a study published in Science, anxious students who did this scored higher. From about a B-minus, to a B-plus.",
      T("RAMIREZ & BEILOCK - 2011", "label", 34), T("B-", "alert", 150), T("to", "soft", 56), T("B+", "grad", 160, "pop"))),
  S(B("Worries take up working memory. Writing them down frees up space for the actual exam.",
      I("brain", 210), T("Writing them down", "head", 70), T("frees up your brain.", "grad", 86, "pop"))),
]),
]


def all_videos():
    vids = []
    for v in BB:
        vids.append(dict(v, series="bb", cta=cta("bb", v["day"])))
    for v in SG:
        vids.append(dict(v, series="sg", cta=cta("sg", v["day"], v.get("module"))))
    return sorted(vids, key=lambda v: v["day"])


if __name__ == "__main__":
    import re
    for v in all_videos():
        words = sum(len(b["vo"].split()) for s in v["scenes"] for b in s["beats"]) + len(v["cta"]["vo"].split())
        print(f'D{v["day"]:02d} {v["series"].upper()}{v["num"]:02d} {v["title"]:<42} {words} words')

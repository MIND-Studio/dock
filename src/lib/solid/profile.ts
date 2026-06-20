import {
  buildThing,
  createSolidDataset,
  createThing,
  getStringNoLocale,
  getThing,
  getUrl,
  setThing,
} from "@inrupt/solid-client";
import { type PodFetch, readResource, writeResource } from "./pod-client";

// Direct RDF term URIs — avoids the optional @inrupt/vocab-common-rdf dep.
const FOAF_NAME = "http://xmlns.com/foaf/0.1/name";
const FOAF_IMG = "http://xmlns.com/foaf/0.1/img";
const VCARD_NOTE = "http://www.w3.org/2006/vcard/ns#note";
const VCARD_HAS_PHOTO = "http://www.w3.org/2006/vcard/ns#hasPhoto";

export type Profile = {
  displayName: string;
  bio?: string;
  /** Avatar image URL. */
  avatarUri?: string;
};

function profileUrl(podRoot: string): string {
  return `${podRoot.replace(/\/?$/, "/")}profile/card`;
}

/** Read the profile from `{pod}/profile/card#me`. Returns null if absent. */
export async function readProfileFromPod(
  podRoot: string,
  podFetch?: PodFetch,
): Promise<Profile | null> {
  const doc = profileUrl(podRoot);
  try {
    const dataset = await readResource(doc, podFetch);
    const thing = getThing(dataset, `${doc}#me`);
    if (!thing) return null;
    return {
      displayName: getStringNoLocale(thing, FOAF_NAME) ?? "",
      bio: getStringNoLocale(thing, VCARD_NOTE) ?? undefined,
      avatarUri:
        getUrl(thing, VCARD_HAS_PHOTO) ??
        getUrl(thing, FOAF_IMG) ??
        getStringNoLocale(thing, VCARD_HAS_PHOTO) ??
        undefined,
    };
  } catch {
    return null;
  }
}

/** Write name/bio/photo to `{pod}/profile/card#me`, preserving other triples. */
export async function writeProfileToPod(
  podRoot: string,
  profile: Profile,
  podFetch?: PodFetch,
): Promise<void> {
  const doc = profileUrl(podRoot);
  const subject = `${doc}#me`;

  let dataset;
  try {
    dataset = await readResource(doc, podFetch);
  } catch {
    dataset = createSolidDataset();
  }

  const existing = getThing(dataset, subject) ?? createThing({ url: subject });
  let builder = buildThing(existing)
    .setStringNoLocale(FOAF_NAME, profile.displayName)
    .setStringNoLocale(VCARD_NOTE, profile.bio ?? "");

  if (profile.avatarUri) builder = builder.setUrl(VCARD_HAS_PHOTO, profile.avatarUri);

  dataset = setThing(dataset, builder.build());
  await writeResource(doc, dataset, podFetch);
}

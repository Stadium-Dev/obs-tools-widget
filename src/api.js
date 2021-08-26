const contentUrl = 'https://api-eu-central-1.graphcms.com/v2/ckpyd6ueoo00f01z0eo4rgn07/master';

export function fetchApi(graphQuery) {
    return fetch(contentUrl, {
        method: 'POST',
        headers: {
            Authorization: 'Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImdjbXMtbWFpbi1wcm9kdWN0aW9uIn0.eyJ2ZXJzaW9uIjozLCJpYXQiOjE2MzAwMDU0MDIsImF1ZCI6WyJodHRwczovL2FwaS1ldS1jZW50cmFsLTEuZ3JhcGhjbXMuY29tL3YyL2NrcHlkNnVlb28wMGYwMXowZW80cmduMDcvbWFzdGVyIiwiaHR0cHM6Ly9tYW5hZ2VtZW50LW5leHQuZ3JhcGhjbXMuY29tIl0sImlzcyI6Imh0dHBzOi8vbWFuYWdlbWVudC5ncmFwaGNtcy5jb20vIiwic3ViIjoiODcxNDBlZjktMzVlNC00ZjkxLTgxZjUtNDU2ZjFjOTU0ZjQzIiwianRpIjoiY2tzdGI0cHR6NWFmMjAxdzlmOHZ1MXF3NyJ9.IEcPmo84uS549hiYi4nVSgK86SRRQoH9EPkWlBIr4sGq1WRrybxlHPLtUR8dskVKWcjk3tD9dkMYebntARWgJGdh8NQK_tYMx59E3_1SwrUkjv4updF3ePaOVmySv2WdDYSrh48j0V5a57QgIQKqApFBlKFKv9hFnw70WGmpMFKaJFW5oY2u4P8hnDYOX8_wQAV2tuux3jjAUk1L8q_T3z6oK3Jh9LbnyLppOyQV2XYQEK7sUVDt1yST5T3Z_110xn5CjmsijIGoCqFJtPOrkBbA-1sk0NLQWfwK6BgE3OkpSGhRG6CWcV6EtqjaDtCFphDb49TugXsTN7pj3o8DENKO-cmimpHpXezfIFTNLvPFY695RL25-ZnR-GetCDR_pqpaj5EG6yQK9XI2qZNRi7z-LpCY6vEcmTBd_h_CZu95sRkFzf1GdbXr00YGmpBo--P7aGM6ZBCht2HkbKpaiBFVzdqmPXfTDisg4V-x2vwTY2I7k_WwgiU6lJExCEa967DigdpI221B5mW00usZVVTdmOdhEucuUQVpIHgezDSQ6puhGVFNUfzA2wyAE1mSu5nI2eJpyij3sTfYhiDXoVAlWWRi8bt1InSqkO-bGtvdq1dlrj0Nn5pNs4lTMXoU6a_X_4BV9ucA8TzIedUThAVzlQhUQA_wjN6YeUooirs'
        },
        body: JSON.stringify({
            query: graphQuery,
            variables: null
        })
    })
        .then(async res => res.json())
        .then(data => {
            return data.data;
        })
        .catch(err => {
            console.error(err);
        })
}

export default class API {
    static fetchOverlays() {
        const clientId = localStorage.getItem('unique-client-id');
        return fetchApi(`
            {
                StreamOverlay(where: { client_uid: "${clientId}" }) {
                    name
                    url
                }
            }
        `).then(data => {
            console.log(data);
        });
    }
}